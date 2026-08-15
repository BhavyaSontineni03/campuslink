import pool from '../config/database';
import { SessionModel } from '../models/Session';
import { getRecommendedFeed, fetchSessionsByIds } from './recommendationService';

interface FtsHit {
  id: number;
  rank: number;
}

// Postgres full-text search over sessions.search_vector (title/description/
// category+tags/organizer_name, weighted A/B/C/D - see 07-engagement.sql).
// websearch_to_tsquery understands plain user input ("quotes", -exclusions,
// OR) so we do not need to hand-roll query parsing.
async function ftsRankedHits(query: string, limit: number): Promise<FtsHit[]> {
  const { rows } = await pool.query(
    `
    SELECT s.id, ts_rank(s.search_vector, q) AS rank
    FROM sessions s, websearch_to_tsquery('english', $1) q
    WHERE s.search_vector @@ q
    ORDER BY rank DESC, s.start_time ASC
    LIMIT $2
    `,
    [query, limit]
  );
  return rows;
}

// Searches sessions by free-text query. An empty query is not a "no results"
// case, it means the user opened search with nothing typed yet, so we serve
// their personalized feed (or a plain chronological list if anonymous)
// instead of an empty result set.
export async function searchSessions(
  query: string,
  options: { userId?: number; limit?: number } = {}
): Promise<any[]> {
  const trimmed = query.trim();
  const limit = options.limit ?? 20;

  if (!trimmed) {
    if (options.userId) {
      return getRecommendedFeed(options.userId, limit);
    }
    const sessions = await SessionModel.findAllWithCapacity();
    return sessions.slice(0, limit);
  }

  const hits = await ftsRankedHits(trimmed, limit);
  if (hits.length === 0) return [];

  const rankById = new Map(hits.map((hit) => [hit.id, hit.rank]));
  const sessions = await fetchSessionsByIds(hits.map((hit) => hit.id));

  return sessions
    .map((session) => ({ ...session, rank: rankById.get(session.id) ?? 0 }))
    .sort((a, b) => (rankById.get(b.id) ?? 0) - (rankById.get(a.id) ?? 0));
}
