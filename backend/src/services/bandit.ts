// Pure Thompson Sampling logic for picking the best (channel, reminder
// offset) combination for session notifications. No DB or Redis here so this
// can be unit tested deterministically by injecting a seeded RNG.
//
// Thompson Sampling in one paragraph: each arm keeps a Beta(alpha, beta)
// posterior over "probability this arm leads to attendance". To pick an arm
// we draw one random sample from each arm's posterior and choose the arm
// with the highest sample. Arms with more data have tighter posteriors
// (less variance), so early on exploration happens naturally; over time the
// best-performing arm gets sampled highest most often. No separate
// explore/exploit schedule (like epsilon-greedy) is needed.

export const CHANNELS = ['email', 'in_app_push', 'sms'] as const;
export type Channel = (typeof CHANNELS)[number];

// Minutes before session start.
export const OFFSETS_MINUTES = [1440, 180, 30] as const;
export type OffsetMinutes = (typeof OFFSETS_MINUTES)[number];

export interface Arm {
  channel: Channel;
  offset_minutes: OffsetMinutes;
  alpha: number;
  beta: number;
}

export type Rng = () => number;

// Above this size, sampling via order statistics would require sorting
// thousands of draws per selectArm call. Fall back to a normal
// approximation of the Beta distribution instead, which is O(1).
const ORDER_STATISTIC_MAX_TRIALS = 2000;

function standardNormal(rng: Rng): number {
  // Box-Muller transform. u1 must be > 0 to avoid log(0).
  let u1 = rng();
  while (u1 <= Number.EPSILON) u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

// Samples one draw from Beta(alpha, beta).
//
// Exact method (used for typical alpha/beta from a handful to a couple
// thousand observations): for positive integers a, b, a Beta(a, b) sample
// equals the a-th order statistic (a-th smallest value) of (a + b - 1) i.i.d.
// Uniform(0,1) draws. This sidesteps needing to invert the incomplete Beta
// function (no closed form) or implement a Gamma sampler.
//
// Approximate method (used once trial counts get large): the Beta
// distribution's mean and variance are known in closed form, and by the CLT
// it becomes approximately normal as alpha + beta grows, so we sample from
// N(mean, variance) instead and clip to [0, 1].
export function sampleBeta(alpha: number, beta: number, rng: Rng = Math.random): number {
  const a = Math.max(1, Math.round(alpha));
  const b = Math.max(1, Math.round(beta));
  const trials = a + b - 1;

  if (trials > ORDER_STATISTIC_MAX_TRIALS) {
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
    return clamp01(mean + standardNormal(rng) * Math.sqrt(variance));
  }

  const draws: number[] = new Array(trials);
  for (let i = 0; i < trials; i++) draws[i] = rng();
  draws.sort((x, y) => x - y);
  return draws[a - 1];
}

// Thompson Sampling arm selection: sample each arm's posterior once and
// return the arm with the highest sample.
export function selectArm<T extends { alpha: number; beta: number }>(arms: T[], rng: Rng = Math.random): T {
  if (arms.length === 0) {
    throw new Error('selectArm: at least one arm is required');
  }

  let best = arms[0];
  let bestSample = sampleBeta(best.alpha, best.beta, rng);

  for (let i = 1; i < arms.length; i++) {
    const sample = sampleBeta(arms[i].alpha, arms[i].beta, rng);
    if (sample > bestSample) {
      best = arms[i];
      bestSample = sample;
    }
  }

  return best;
}

// Bernoulli-Beta conjugate update. reward = 1 means the outcome we care
// about happened (e.g. the user attended after this notification), 0 means
// it did not. Pure function: returns new values instead of mutating.
export function updatePosterior(
  alpha: number,
  beta: number,
  reward: 0 | 1
): { alpha: number; beta: number };
export function updatePosterior(arm: Arm, reward: 0 | 1): Arm;
export function updatePosterior(
  alphaOrArm: number | Arm,
  betaOrReward: number | 0 | 1,
  reward?: 0 | 1
): { alpha: number; beta: number } | Arm {
  if (typeof alphaOrArm === 'object') {
    const arm = alphaOrArm;
    const r = betaOrReward as 0 | 1;
    return {
      ...arm,
      alpha: arm.alpha + r,
      beta: arm.beta + (1 - r),
    };
  }
  const alpha = alphaOrArm;
  const beta = betaOrReward as number;
  const r = reward as 0 | 1;
  return {
    alpha: alpha + r,
    beta: beta + (1 - r),
  };
}

export type ArmState = Arm;
export const OFFSETS = OFFSETS_MINUTES as unknown as number[];

export function defaultArms(): Arm[] {
  const arms: Arm[] = [];
  for (const channel of CHANNELS) {
    for (const offset_minutes of OFFSETS_MINUTES) {
      arms.push({ channel, offset_minutes, alpha: 1, beta: 1 });
    }
  }
  return arms;
}
