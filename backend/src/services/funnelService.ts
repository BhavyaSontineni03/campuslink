import pool from '../config/database';
import { FunnelStage } from '../types';
import { analyzeFunnel, FunnelAnalysis } from './funnel';

// Records one funnel event. Callers are responsible for logging each stage
// transition once per user/session (e.g. on first view, not every render),
// since the aggregation below treats each row as one "reached this stage"
// occurrence.
export async function logFunnelEvent(
  sessionId: number,
  stage: FunnelStage,
  userId?: number
): Promise<void> {
  await pool.query(
    'INSERT INTO funnel_events (user_id, session_id, stage) VALUES ($1, $2, $3)',
    [userId ?? null, sessionId, stage]
  );
}

export interface FunnelAnalyticsOptions {
  sessionId?: number;
  windowDays?: number;
}

// Aggregates funnel_events into per-stage counts over a trailing window and
// hands them off to the pure conversion-rate math in funnel.ts.
export async function getFunnelAnalytics(
  options: FunnelAnalyticsOptions = {}
): Promise<FunnelAnalysis> {
  const windowDays = options.windowDays ?? 30;
  const params: (number | string)[] = [windowDays];

  let query = `
    SELECT stage, COUNT(*)::int as count
    FROM funnel_events
    WHERE created_at >= NOW() - make_interval(days => $1)
  `;

  if (options.sessionId) {
    params.push(options.sessionId);
    query += ` AND session_id = $${params.length}`;
  }

  query += ' GROUP BY stage';

  const { rows } = await pool.query(query, params);
  const counts: Partial<Record<FunnelStage, number>> = {};
  for (const row of rows) {
    counts[row.stage as FunnelStage] = row.count;
  }

  return analyzeFunnel(counts);
}
