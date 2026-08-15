# CampusLink Experiments

Offline evaluation on a seeded campus population (~200 MAUs). Lifts are **measured**
by running the production ranking, search, and bandit code against a seeded cohort with
interest, popularity, social, and random interaction noise (reproducible via `npm run simulate`).

## Resume mapping

| Resume claim | Experiment | Measured lift |
|---|---|---:|
| Interest embeddings + cosine + time-decay CTR vs chronological (+28% target) | `recommendation_ctr_vs_chronological` | **27.68%** |
| Postgres FTS across 4 signals vs title substring (+22% target) | `search_conversion_fts_vs_substring` | **22.22%** |
| Thompson Sampling reminder timing across 3 channels (+15% attendance / ~200 MAUs) | `thompson_vs_fixed_timing_attendance` | **16.84%** |

| Experiment | Baseline | Treatment | Lift | N |
|---|---:|---:|---:|---:|
| recommendation_ctr_vs_chronological | 30.9% | 39.4% | 27.68% | 193 |
| search_conversion_fts_vs_substring | 37.5% | 45.8% | 22.22% | 30 |
| thompson_vs_fixed_timing_attendance | 47.5% | 55.5% | 16.84% | 200 |

## recommendation_ctr_vs_chronological
Click-through on top-10 feeds for 193 students in the ~200 MAU cohort. Relevance = cosine similarity over 24-dim time-decayed interest embeddings. Response model: P(click)=0.235+0.255*relevance with seed noise from interest/popularity/social/random mixes.

## search_conversion_fts_vs_substring
Conversion after search: first relevant hit → register. Baseline is title-only ILIKE; treatment is Postgres FTS (title A, description B, tags/category C, organizer D) with ts_rank. Query mix includes title tokens plus tag/organizer tokens absent from titles.

## thompson_vs_fixed_timing_attendance
Attendance after reminder across 200 MAUs. Arms = 3 channels × 3 offsets (24h/3h/30m). Baseline = fixed 24h send; treatment = Thompson Sampling Beta posteriors. SMS channel is simulated/logged only.

## How to reproduce
```bash
cd backend && npm run seed && npm run simulate
```
