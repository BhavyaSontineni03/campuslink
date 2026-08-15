import { sampleBeta, selectArm, updatePosterior, CHANNELS, OFFSETS_MINUTES, Rng } from '../src/services/bandit';

// Deterministic seeded PRNG (mulberry32) so statistical assertions below are
// reproducible across runs and CI machines, unlike Math.random().
function mulberry32(seed: number): Rng {
  let a = seed;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('sampleBeta', () => {
  it('returns the raw draw directly for Beta(1,1), since trials = 1', () => {
    const fixedRng = () => 0.37;
    expect(sampleBeta(1, 1, fixedRng)).toBeCloseTo(0.37);
  });

  it('returns the a-th order statistic for Beta(a, 1) - i.e. the max of a draws', () => {
    const values = [0.2, 0.9, 0.5];
    let i = 0;
    const rng: Rng = () => values[i++];

    // alpha=3, beta=1 -> trials = 3, expect the maximum of the three draws.
    const result = sampleBeta(3, 1, rng);
    expect(result).toBeCloseTo(0.9);
  });

  it('always returns a value in [0, 1]', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const value = sampleBeta(5, 7, rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('approximates the Beta(1,1) uniform mean of 0.5 over many samples', () => {
    const rng = mulberry32(42);
    const samples = Array.from({ length: 4000 }, () => sampleBeta(1, 1, rng));
    const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    expect(mean).toBeCloseTo(0.5, 1);
  });

  it('approximates the Beta(alpha, beta) mean of alpha / (alpha + beta)', () => {
    const rng = mulberry32(7);
    const samples = Array.from({ length: 3000 }, () => sampleBeta(8, 2, rng));
    const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    expect(mean).toBeCloseTo(0.8, 1);
  });

  it('falls back to a normal approximation for very large trial counts without throwing', () => {
    const rng = mulberry32(99);
    const value = sampleBeta(5000, 5000, rng);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    expect(value).toBeCloseTo(0.5, 1);
  });
});

describe('selectArm', () => {
  it('picks the arm whose sampled draw is highest', () => {
    const arms = [
      { id: 'a', alpha: 1, beta: 1 },
      { id: 'b', alpha: 1, beta: 1 },
      { id: 'c', alpha: 1, beta: 1 },
    ];
    // Each Beta(1,1) arm consumes exactly one rng() call (trials = 1).
    const values = [0.9, 0.1, 0.5];
    let i = 0;
    const rng: Rng = () => values[i++];

    const chosen = selectArm(arms, rng);
    expect(chosen.id).toBe('a');
  });

  it('throws when given no arms', () => {
    expect(() => selectArm([])).toThrow();
  });

  it('favors an arm with a much stronger posterior over many repeated selections', () => {
    const rng = mulberry32(123);
    const arms = [
      { id: 'good', alpha: 80, beta: 20 },
      { id: 'bad', alpha: 20, beta: 80 },
    ];

    let goodWins = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      if (selectArm(arms, rng).id === 'good') goodWins++;
    }

    // Not every trial needs to pick "good" (that's the point of Thompson
    // Sampling still exploring occasionally), but it should dominate heavily.
    expect(goodWins).toBeGreaterThan(trials * 0.75);
  });
});

describe('updatePosterior', () => {
  it('increments alpha and leaves beta unchanged on reward = 1', () => {
    expect(updatePosterior(2, 3, 1)).toEqual({ alpha: 3, beta: 3 });
  });

  it('increments beta and leaves alpha unchanged on reward = 0', () => {
    expect(updatePosterior(2, 3, 0)).toEqual({ alpha: 2, beta: 4 });
  });

  it('is pure and does not mutate its inputs', () => {
    const alpha = 5;
    const beta = 5;
    updatePosterior(alpha, beta, 1);
    expect(alpha).toBe(5);
    expect(beta).toBe(5);
  });
});

describe('channel/offset configuration', () => {
  it('exposes exactly the 3 channels and 3 offsets described in the spec', () => {
    expect(CHANNELS).toEqual(['email', 'in_app_push', 'sms']);
    expect(OFFSETS_MINUTES).toEqual([1440, 180, 30]);
  });
});
