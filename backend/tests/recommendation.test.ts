import {
  buildTagVector,
  buildUserVector,
  cosineSimilarity,
  l2Normalize,
  rankSessions,
  vectorMagnitude,
  TAG_VOCABULARY,
} from '../src/services/recommendation';

describe('buildTagVector', () => {
  it('sets 1 at positions for known tags and ignores unknown ones', () => {
    const vector = buildTagVector(['tech', 'music', 'not-a-real-tag']);
    const tally = vector.reduce((sum, v) => sum + v, 0);
    expect(tally).toBe(2);
    expect(vector[TAG_VOCABULARY.indexOf('tech')]).toBe(1);
    expect(vector[TAG_VOCABULARY.indexOf('music')]).toBe(1);
  });

  it('returns an all-zero vector for no tags', () => {
    const vector = buildTagVector([]);
    expect(vectorMagnitude(vector)).toBe(0);
  });
});

describe('l2Normalize / vectorMagnitude', () => {
  it('scales a vector to unit length', () => {
    const normalized = l2Normalize([3, 4]);
    expect(vectorMagnitude(normalized)).toBeCloseTo(1);
    expect(normalized).toEqual([0.6, 0.8]);
  });

  it('leaves a zero vector as zero instead of dividing by zero', () => {
    const normalized = l2Normalize([0, 0, 0]);
    expect(normalized).toEqual([0, 0, 0]);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical direction vectors', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 when either vector has zero magnitude, instead of NaN', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('throws on mismatched vector lengths', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });
});

describe('buildUserVector', () => {
  const now = new Date('2026-07-24T00:00:00Z');

  it('weighs interaction types per INTERACTION_WEIGHTS (attend > register > favorite > view)', () => {
    const tagsBySession = { 1: ['tech'], 2: ['music'] };

    const viewOnly = buildUserVector(
      [{ session_id: 1, interaction_type: 'view', created_at: now }],
      tagsBySession,
      0.05,
      now
    );
    const attendOnly = buildUserVector(
      [{ session_id: 2, interaction_type: 'attend', created_at: now }],
      tagsBySession,
      0.05,
      now
    );

    // Both are unit vectors (single tag each), so instead compare pre-normalization
    // weight by checking that a mixed vector leans toward the stronger signal.
    const mixed = buildUserVector(
      [
        { session_id: 1, interaction_type: 'view', created_at: now },
        { session_id: 2, interaction_type: 'attend', created_at: now },
      ],
      tagsBySession,
      0.05,
      now
    );

    const techIdx = TAG_VOCABULARY.indexOf('tech');
    const musicIdx = TAG_VOCABULARY.indexOf('music');
    expect(mixed[musicIdx]).toBeGreaterThan(mixed[techIdx]);
    expect(viewOnly[techIdx]).toBeGreaterThan(0);
    expect(attendOnly[musicIdx]).toBeGreaterThan(0);
  });

  it('applies exponential time decay so older interactions contribute less', () => {
    const tagsBySession = { 1: ['tech'] };

    const recent = buildUserVector(
      [{ session_id: 1, interaction_type: 'view', created_at: now }],
      tagsBySession,
      0.05,
      now
    );
    const oldDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const old = buildUserVector(
      [{ session_id: 1, interaction_type: 'view', created_at: oldDate }],
      tagsBySession,
      0.05,
      now
    );

    const techIdx = TAG_VOCABULARY.indexOf('tech');
    // Both are single-tag unit vectors after normalization, so magnitude alone
    // will not show decay - check the pre-normalized weight via a mixed case
    // where decay changes the *relative* contribution.
    const tagsBySession2 = { 1: ['tech'], 2: ['music'] };
    const mixedRecentOld = buildUserVector(
      [
        { session_id: 1, interaction_type: 'view', created_at: now },
        { session_id: 2, interaction_type: 'view', created_at: oldDate },
      ],
      tagsBySession2,
      0.05,
      now
    );
    const musicIdx = TAG_VOCABULARY.indexOf('music');
    expect(mixedRecentOld[techIdx]).toBeGreaterThan(mixedRecentOld[musicIdx]);
    expect(recent[techIdx]).toBeGreaterThan(0);
    expect(old[techIdx]).toBeGreaterThan(0);
  });

  it('returns a zero vector when interactions reference sessions with no known tags', () => {
    const vector = buildUserVector(
      [{ session_id: 99, interaction_type: 'attend', created_at: now }],
      {},
      0.05,
      now
    );
    expect(vectorMagnitude(vector)).toBe(0);
  });

  it('returns a unit-magnitude vector when there is signal', () => {
    const vector = buildUserVector(
      [{ session_id: 1, interaction_type: 'favorite', created_at: now }],
      { 1: ['tech'] },
      0.05,
      now
    );
    expect(vectorMagnitude(vector)).toBeCloseTo(1);
  });
});

describe('rankSessions', () => {
  const baseSession = (overrides: Record<string, unknown>) => ({
    id: 1,
    tags: [] as string[],
    start_time: new Date('2026-08-01T00:00:00Z'),
    approved_count: 0,
    ...overrides,
  });

  it('ranks sessions by cosine similarity to the user vector, highest first', () => {
    const userVector = buildTagVector(['tech']); // not normalized on purpose, cosine handles it

    const sessions = [
      baseSession({ id: 1, tags: ['music'], start_time: new Date('2026-08-01T00:00:00Z') }),
      baseSession({ id: 2, tags: ['tech'], start_time: new Date('2026-08-02T00:00:00Z') }),
      baseSession({ id: 3, tags: ['tech', 'workshop'], start_time: new Date('2026-08-03T00:00:00Z') }),
    ];

    const ranked = rankSessions(userVector, sessions);
    expect(ranked[0].id).toBe(2); // pure "tech" match scores highest cosine similarity
    expect(ranked.map((s) => s.id)).toContain(3);
    expect(ranked.map((s) => s.id)).toContain(1);
  });

  it('excludes sessions the user is already registered for', () => {
    const userVector = buildTagVector(['tech']);
    const sessions = [
      baseSession({ id: 1, tags: ['tech'] }),
      baseSession({ id: 2, tags: ['tech'] }),
    ];

    const ranked = rankSessions(userVector, sessions, { registeredSessionIds: [1] });
    expect(ranked.map((s) => s.id)).toEqual([2]);
  });

  it('breaks ties by soonest start_time', () => {
    const userVector = buildTagVector(['tech']);
    const sessions = [
      baseSession({ id: 1, tags: ['tech'], start_time: new Date('2026-09-01T00:00:00Z') }),
      baseSession({ id: 2, tags: ['tech'], start_time: new Date('2026-08-01T00:00:00Z') }),
    ];

    const ranked = rankSessions(userVector, sessions);
    expect(ranked[0].id).toBe(2);
    expect(ranked[0].score).toBeCloseTo(ranked[1].score);
  });

  it('falls back to a popularity/chronological blend for a cold-start (zero-magnitude) user vector', () => {
    const zeroVector = new Array(TAG_VOCABULARY.length).fill(0);
    const sessions = [
      baseSession({ id: 1, tags: ['tech'], approved_count: 0, start_time: new Date('2026-12-01T00:00:00Z') }),
      baseSession({ id: 2, tags: ['music'], approved_count: 50, start_time: new Date('2026-08-01T00:00:00Z') }),
    ];

    const ranked = rankSessions(zeroVector, sessions);
    // Session 2 is both more popular and sooner, so it should win comfortably.
    expect(ranked[0].id).toBe(2);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
