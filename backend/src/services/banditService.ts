import pool from '../config/database';
import redis from '../config/redis';
import {
  Arm,
  Channel,
  OffsetMinutes,
  CHANNELS,
  OFFSETS_MINUTES,
  Rng,
  selectArm,
  updatePosterior,
} from './bandit';

interface BetaState {
  alpha: number;
  beta: number;
}

const armKey = (channel: Channel, offsetMinutes: OffsetMinutes): string =>
  `bandit:${channel}:${offsetMinutes}`;

// Redis holds the hot posterior state so arm selection (on the notification
// send path, which is latency sensitive) never blocks on Postgres. Postgres
// (notification_experiments) remains the source of truth and is written
// through on every update so state survives a Redis flush/restart.
async function getArmState(channel: Channel, offsetMinutes: OffsetMinutes): Promise<BetaState> {
  try {
    const raw = await redis.get(armKey(channel, offsetMinutes));
    if (raw) return JSON.parse(raw) as BetaState;
  } catch (error) {
    console.error('Failed to read bandit state from redis:', error);
  }

  const { rows } = await pool.query(
    'SELECT alpha, beta FROM notification_experiments WHERE channel = $1 AND offset_minutes = $2',
    [channel, offsetMinutes]
  );
  const state: BetaState = rows[0] ?? { alpha: 1, beta: 1 };
  await setArmState(channel, offsetMinutes, state);
  return state;
}

async function setArmState(channel: Channel, offsetMinutes: OffsetMinutes, state: BetaState): Promise<void> {
  try {
    await redis.set(armKey(channel, offsetMinutes), JSON.stringify(state));
  } catch (error) {
    console.error('Failed to write bandit state to redis:', error);
  }
}

async function snapshotArmToDb(channel: Channel, offsetMinutes: OffsetMinutes, state: BetaState): Promise<void> {
  await pool.query(
    `UPDATE notification_experiments
     SET alpha = $1, beta = $2, updated_at = NOW()
     WHERE channel = $3 AND offset_minutes = $4`,
    [state.alpha, state.beta, channel, offsetMinutes]
  );
}

async function getAllArms(): Promise<Arm[]> {
  const arms: Arm[] = [];
  for (const channel of CHANNELS) {
    for (const offset_minutes of OFFSETS_MINUTES) {
      const state = await getArmState(channel, offset_minutes);
      arms.push({ channel, offset_minutes, ...state });
    }
  }
  return arms;
}

// Picks the (channel, offset) combination to use for a reminder via
// Thompson Sampling over the current per-arm posteriors.
export async function selectNotificationArm(rng?: Rng): Promise<Arm> {
  const arms = await getAllArms();
  return selectArm(arms, rng);
}

// Records that a reminder was actually sent, so we can later look up which
// arm was used when reconciling attendance outcomes.
export async function recordNotificationSend(
  userId: number,
  sessionId: number,
  channel: Channel,
  offsetMinutes: OffsetMinutes
): Promise<void> {
  await pool.query(
    `INSERT INTO notification_sends (user_id, session_id, channel, offset_minutes)
     VALUES ($1, $2, $3, $4)`,
    [userId, sessionId, channel, offsetMinutes]
  );
}

// Applies one Bernoulli-Beta posterior update for an arm and persists it to
// both the hot cache and the durable snapshot table.
export async function updateArmPosterior(
  channel: Channel,
  offsetMinutes: OffsetMinutes,
  reward: 0 | 1
): Promise<BetaState> {
  const current = await getArmState(channel, offsetMinutes);
  const next = updatePosterior(current.alpha, current.beta, reward);
  await setArmState(channel, offsetMinutes, next);
  await snapshotArmToDb(channel, offsetMinutes, next);
  return next;
}

// Reconciliation: once a session has ended, for every reminder we sent that
// still has no recorded outcome, check whether that user actually checked in
// and feed the result back into the relevant arm's posterior. This is what
// closes the Thompson Sampling loop - reward is delayed (only known once the
// session has happened), so we cannot update posteriors at send time.
export async function reconcileSessionOutcomes(sessionId: number): Promise<number> {
  const { rows: pendingSends } = await pool.query(
    `SELECT id, user_id, channel, offset_minutes
     FROM notification_sends
     WHERE session_id = $1 AND outcome_recorded_at IS NULL`,
    [sessionId]
  );

  for (const send of pendingSends) {
    const { rows: attendanceRows } = await pool.query(
      `SELECT 1
       FROM reservations r
       JOIN attendance a ON a.reservation_id = r.id
       WHERE r.user_id = $1 AND r.session_id = $2 AND a.checkin_time IS NOT NULL`,
      [send.user_id, sessionId]
    );
    const attended = attendanceRows.length > 0;

    await pool.query(
      `UPDATE notification_sends
       SET attended = $1, outcome_recorded_at = NOW()
       WHERE id = $2`,
      [attended, send.id]
    );

    await updateArmPosterior(send.channel, send.offset_minutes, attended ? 1 : 0);
  }

  return pendingSends.length;
}

export interface ArmSnapshot extends BetaState {
  channel: Channel;
  offset_minutes: OffsetMinutes;
  mean: number;
  total_trials: number;
}

// Reads the durable snapshot table for the analytics endpoint. Uses
// Postgres rather than Redis since it should reflect confirmed history, not
// whatever happens to be warm in the cache.
export async function getExperimentSnapshot(): Promise<ArmSnapshot[]> {
  const { rows } = await pool.query(
    `SELECT channel, offset_minutes, alpha, beta
     FROM notification_experiments
     ORDER BY channel, offset_minutes DESC`
  );

  return rows.map((row) => {
    const alpha = Number(row.alpha);
    const beta = Number(row.beta);
    return {
      channel: row.channel,
      offset_minutes: row.offset_minutes,
      alpha,
      beta,
      mean: alpha / (alpha + beta),
      total_trials: alpha + beta - 2, // subtract the alpha=1, beta=1 prior
    };
  });
}

/** Reconcile all ended sessions with pending notification outcomes. */
export async function reconcileBanditRewards(): Promise<{ reconciled: number }> {
  const { rows } = await pool.query(
    `SELECT DISTINCT ns.session_id
     FROM notification_sends ns
     JOIN sessions s ON s.id = ns.session_id
     WHERE ns.outcome_recorded_at IS NULL AND s.end_time < NOW()
     LIMIT 100`
  );
  let reconciled = 0;
  for (const row of rows) {
    reconciled += await reconcileSessionOutcomes(row.session_id);
  }
  return { reconciled };
}

export async function getBanditSnapshot() {
  return getExperimentSnapshot();
}

/** Select an arm for a channel, record the send, and optionally create an in-app reminder. */
export async function scheduleReminder(
  userId: number,
  sessionId: number,
  channel: Channel = 'in_app_push'
) {
  const arms = (await getAllArms()).filter((a) => a.channel === channel);
  const chosen = selectArm(arms);
  await recordNotificationSend(userId, sessionId, chosen.channel, chosen.offset_minutes);

  if (channel === 'in_app_push') {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'session_reminder', 'Event reminder', 'Your event is coming up soon.', $2)`,
      [userId, JSON.stringify({ session_id: sessionId, offset_minutes: chosen.offset_minutes, channel })]
    );
  }

  return chosen;
}
