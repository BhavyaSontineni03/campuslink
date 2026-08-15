import { InteractionType } from '../types';

// Pure scoring logic for the recommendation feed. No DB or Redis access here
// so this module can be unit tested deterministically. recommendationService.ts
// wires this up to real data and caching.

// Fixed tag vocabulary. Using a fixed-size vector (instead of a dynamic
// bag-of-tags) keeps buildTagVector/buildUserVector O(vocabulary size) and lets
// us compare any two sessions or users with plain cosine similarity, no
// sparse-vector bookkeeping required. Unknown tags are ignored rather than
// growing the vector, which keeps the feature space stable across deploys.
export const TAG_VOCABULARY = [
  'academic',
  'arts',
  'career',
  'community-service',
  'cultural',
  'fitness',
  'food',
  'gaming',
  'greek-life',
  'health',
  'leadership',
  'music',
  'networking',
  'outdoors',
  'performance',
  'professional-development',
  'religious',
  'social',
  'sports',
  'stem',
  'tech',
  'volunteer',
  'wellness',
  'workshop',
] as const;

const TAG_INDEX: Record<string, number> = TAG_VOCABULARY.reduce((acc, tag, i) => {
  acc[tag] = i;
  return acc;
}, {} as Record<string, number>);

// Implicit feedback weights: stronger signals (attending) count for more
// than weak ones (viewing). Tunable without touching the scoring math.
const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  view: 1,
  favorite: 2,
  register: 3,
  attend: 4,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Below this magnitude the user vector is effectively all zeros (new user,
// or all their interactions were on untagged sessions) - treat as cold start.
const COLD_START_EPSILON = 1e-6;

const POPULARITY_WEIGHT = 0.5;
const CHRONOLOGICAL_WEIGHT = 0.5;

export interface InteractionInput {
  session_id: number;
  interaction_type: InteractionType;
  created_at: Date | string;
}

// Maps a session's tags onto the fixed vocabulary as a binary presence vector.
export function buildTagVector(tags: string[]): number[] {
  const vector = new Array(TAG_VOCABULARY.length).fill(0);
  for (const tag of tags) {
    const idx = TAG_INDEX[tag];
    if (idx !== undefined) vector[idx] = 1;
  }
  return vector;
}

export function vectorMagnitude(vector: number[]): number {
  let sumSquares = 0;
  for (const v of vector) sumSquares += v * v;
  return Math.sqrt(sumSquares);
}

// Scales a vector to unit length so raw interaction counts do not dominate
// cosine similarity - only the *direction* (tag preference mix) matters.
export function l2Normalize(vector: number[]): number[] {
  const magnitude = vectorMagnitude(vector);
  if (magnitude < COLD_START_EPSILON) return vector.map(() => 0);
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('cosineSimilarity: vectors must be the same length');
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  const magnitudeProduct = vectorMagnitude(a) * vectorMagnitude(b);
  if (magnitudeProduct < COLD_START_EPSILON) return 0;
  return dot / magnitudeProduct;
}

// Builds a user's taste profile as a weighted, time-decayed, L2-normalized
// vector over the tag vocabulary.
//
// weight(interaction) = INTERACTION_WEIGHTS[type] * exp(-lambda * ageInDays)
//
// Exponential decay means an "attend" from a year ago eventually contributes
// less than a "view" from yesterday, so the profile tracks recent interests
// without a hard cutoff window.
export function buildUserVector(
  interactions: InteractionInput[],
  tagsBySession: Record<number, string[]>,
  lambda: number = 0.05,
  now: Date = new Date()
): number[] {
  const vector = new Array(TAG_VOCABULARY.length).fill(0);

  for (const interaction of interactions) {
    const tags = tagsBySession[interaction.session_id];
    if (!tags || tags.length === 0) continue;

    const weight = INTERACTION_WEIGHTS[interaction.interaction_type];
    const ageDays = Math.max(
      0,
      (now.getTime() - new Date(interaction.created_at).getTime()) / MS_PER_DAY
    );
    const decay = Math.exp(-lambda * ageDays);
    const contribution = weight * decay;

    for (const tag of tags) {
      const idx = TAG_INDEX[tag];
      if (idx !== undefined) vector[idx] += contribution;
    }
  }

  return l2Normalize(vector);
}

export interface RankableSession {
  id: number;
  tags?: string[];
  start_time: Date | string;
  approved_count?: number;
  [key: string]: unknown;
}

export type RankedResult<T> = T & { score: number };

// Popularity + chronological blend used for cold start (new users with no
// interaction history yet, or a zero-magnitude taste vector). Both signals
// are min-max normalized to [0, 1] before blending so neither dominates just
// because of its raw scale (attendee counts vs. millisecond timestamps).
function blendPopularityChronological<T extends RankableSession>(
  sessions: T[]
): RankedResult<T>[] {
  if (sessions.length === 0) return [];

  const maxPopularity = Math.max(1, ...sessions.map((s) => s.approved_count ?? 0));
  const startTimes = sessions.map((s) => new Date(s.start_time).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...startTimes);
  const timeRange = Math.max(1, maxTime - minTime);

  return sessions
    .map((session) => {
      const popularityScore = (session.approved_count ?? 0) / maxPopularity;
      // Soonest session -> 1, farthest-out session -> 0.
      const chronologicalScore =
        1 - (new Date(session.start_time).getTime() - minTime) / timeRange;
      const score =
        POPULARITY_WEIGHT * popularityScore + CHRONOLOGICAL_WEIGHT * chronologicalScore;
      return { ...session, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
}

// Ranks candidate sessions for a user by cosine similarity between the
// user's taste vector and each session's tag vector. Falls back to a
// popularity/chronological blend for cold-start users. Ties break by
// soonest start_time so the feed stays actionable rather than arbitrary.
export function rankSessions<T extends RankableSession>(
  userVector: number[],
  sessions: T[],
  options: { registeredSessionIds?: Iterable<number> } = {}
): RankedResult<T>[] {
  const registered = new Set(options.registeredSessionIds ?? []);
  const candidates = sessions.filter((s) => !registered.has(s.id));

  if (vectorMagnitude(userVector) < COLD_START_EPSILON) {
    return blendPopularityChronological(candidates);
  }

  return candidates
    .map((session) => ({
      ...session,
      score: cosineSimilarity(userVector, buildTagVector(session.tags ?? [])),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
}
