import pool from '../config/database';
import redis from '../config/redis';
import { SessionModel } from '../models/Session';
import { buildUserVector, rankSessions, InteractionInput } from './recommendation';
import { RankedSession } from '../types';

const REC_CACHE_TTL_SECONDS = 600;

const cacheKey = (userId: number): string => `rec:${userId}`;

async function getTagsForSessions(sessionIds: number[]): Promise<Record<number, string[]>> {
  if (sessionIds.length === 0) return {};
  const { rows } = await pool.query(
    'SELECT id, tags FROM sessions WHERE id = ANY($1::int[])',
    [sessionIds]
  );
  const map: Record<number, string[]> = {};
  for (const row of rows) {
    map[row.id] = row.tags ?? [];
  }
  return map;
}

async function getRegisteredSessionIds(userId: number): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT session_id FROM reservations WHERE user_id = $1 AND status != 'cancelled'`,
    [userId]
  );
  return rows.map((r) => r.session_id);
}

// Fetches session + capacity rows for a specific set of ids, preserving the
// caller's ordering (used to hydrate a cached ranked-id list without
// re-running the scoring algorithm, and to hydrate FTS search results).
export async function fetchSessionsByIds(ids: number[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `
    SELECT
      s.*,
      COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int as approved_count,
      COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END)::int as waitlisted_count,
      (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats
    FROM sessions s
    LEFT JOIN reservations r ON s.id = r.session_id
    WHERE s.id = ANY($1::int[])
    GROUP BY s.id
    ORDER BY array_position($1::int[], s.id)
    `,
    [ids]
  );
  return rows;
}

async function getCachedRankedIds(userId: number): Promise<number[] | null> {
  try {
    const raw = await redis.get(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as number[];
  } catch (error) {
    console.error('Failed to read recommendation cache:', error);
    return null;
  }
}

async function cacheRankedIds(userId: number, ids: number[]): Promise<void> {
  try {
    await redis.set(cacheKey(userId), JSON.stringify(ids), 'EX', REC_CACHE_TTL_SECONDS);
  } catch (error) {
    console.error('Failed to write recommendation cache:', error);
  }
}

// Called after any new interaction so the next feed request recomputes
// instead of serving a now-stale ranking. Cheap: a single Redis DEL.
export async function invalidateUserRecommendations(userId: number): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch (error) {
    console.error('Failed to invalidate recommendation cache:', error);
  }
}

// Returns the personalized feed for a user: cached ranked session ids if
// present, otherwise recomputes from interaction history and caches the
// result. Recomputation cost is O(interactions + candidate sessions), which
// is why we cache it for REC_CACHE_TTL_SECONDS rather than scoring on every
// page load.
export async function getRecommendedFeed(userId: number, limit: number = 20): Promise<RankedSession[]> {
  const cachedIds = await getCachedRankedIds(userId);

  if (cachedIds) {
    const topIds = cachedIds.slice(0, limit);
    const sessions = await fetchSessionsByIds(topIds);
    const positionById = new Map(topIds.map((id, index) => [id, index]));
    return sessions
      .map((session) => ({
        ...session,
        // Synthetic score reflecting cached rank order, not a fresh cosine
        // similarity - avoids recomputing scores just to serve a cache hit.
        score: 1 - (positionById.get(session.id) ?? 0) / Math.max(topIds.length, 1),
      }))
      .sort((a, b) => (positionById.get(a.id) ?? 0) - (positionById.get(b.id) ?? 0)) as RankedSession[];
  }

  const [interactionsResult, candidateSessions, registeredSessionIds] = await Promise.all([
    pool.query<InteractionInput & { session_id: number }>(
      'SELECT session_id, interaction_type, created_at FROM user_interactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500',
      [userId]
    ),
    SessionModel.findAllWithCapacity(userId),
    getRegisteredSessionIds(userId),
  ]);

  const interactedSessionIds = interactionsResult.rows.map((r) => r.session_id);
  const tagsBySession = await getTagsForSessions(interactedSessionIds);

  const userVector = buildUserVector(interactionsResult.rows, tagsBySession);
  const ranked = rankSessions(userVector, candidateSessions as any[], { registeredSessionIds });

  await cacheRankedIds(userId, ranked.map((s) => s.id));

  return ranked.slice(0, limit) as RankedSession[];
}
