import { FunnelStage } from '../types';

// Pure aggregation logic for the registration funnel. No DB access here so
// the math can be unit tested with hand-picked counts.

export const FUNNEL_STAGES: FunnelStage[] = [
  'viewed',
  'opened',
  'started_registration',
  'completed_registration',
  'attended',
];

export interface StageConversion {
  stage: FunnelStage;
  count: number;
  // Fraction of the previous stage's count that reached this stage. null
  // for the first stage, which has no "previous".
  conversionFromPrevious: number | null;
  // Fraction of the first stage's count that reached this stage.
  conversionFromStart: number;
}

export interface DropOff {
  fromStage: FunnelStage;
  toStage: FunnelStage;
  dropOffRate: number;
}

export interface FunnelAnalysis {
  stages: StageConversion[];
  biggestDropOff: DropOff | null;
}

// Computes per-stage conversion rates and identifies the single biggest
// drop-off between two consecutive stages, given raw counts per stage.
//
// Counts are assumed to already be "reached at least this stage" counts for
// a fixed cohort (e.g. distinct users per stage in a time window), so
// conversionFromPrevious is a simple ratio rather than needing to track
// individual user paths through the funnel.
export function analyzeFunnel(counts: Partial<Record<FunnelStage, number>>): FunnelAnalysis {
  const startCount = counts[FUNNEL_STAGES[0]] ?? 0;

  const stages: StageConversion[] = [];
  let previousCount: number | null = null;

  for (const stage of FUNNEL_STAGES) {
    const count = counts[stage] ?? 0;
    const conversionFromPrevious =
      previousCount === null ? null : previousCount === 0 ? 0 : count / previousCount;
    const conversionFromStart = startCount === 0 ? 0 : count / startCount;

    stages.push({ stage, count, conversionFromPrevious, conversionFromStart });
    previousCount = count;
  }

  let biggestDropOff: DropOff | null = null;
  for (let i = 1; i < stages.length; i++) {
    const conversion = stages[i].conversionFromPrevious ?? 1;
    const dropOffRate = 1 - conversion;
    if (!biggestDropOff || dropOffRate > biggestDropOff.dropOffRate) {
      biggestDropOff = {
        fromStage: stages[i - 1].stage,
        toStage: stages[i].stage,
        dropOffRate,
      };
    }
  }

  return { stages, biggestDropOff };
}
