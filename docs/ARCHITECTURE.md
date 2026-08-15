# CampusLink Architecture

## Purpose

Fix campus event discovery (personalized ranking + relevance search) and timing
(per-channel reminder experiments), and expose a registration-to-attendance
funnel to organizers.

## Runtime

- **Frontend:** React 18 + Vite + Tailwind + Zustand + React Query
- **API:** Express on Node 20, JWT auth
- **DB:** PostgreSQL 15 (capacity-safe reservations, FTS `search_vector`, engagement tables)
- **Cache / bandit / pubsub:** Redis
- **Realtime:** WebSocket server on `/ws` (JWT on connect), Redis pub/sub for fanout

## Core services

| Module | Role |
|---|---|
| `services/recommendation.ts` | Pure interest-vector scoring |
| `services/recommendationService.ts` | DB + Redis-cached feed |
| `services/searchService.ts` | `websearch_to_tsquery` + `ts_rank` |
| `services/bandit.ts` | Thompson Sampling (Beta posteriors) |
| `services/banditService.ts` | Send log, reward reconciliation |
| `services/funnel.ts` / `funnelService.ts` | Stage logging + drop-off summary |
| `ws/index.ts` | Authenticated realtime events |

## Data highlights

- `user_interactions` feeds the recommender
- `sessions.tags` + `search_vector` (trigger-maintained) power ranking and FTS
- `funnel_events` stages: viewed → opened → started_registration → completed_registration → attended
- `notification_sends` / `notification_experiments` back the bandit

## Local ports

Compose maps Postgres to host `5433` and Redis to `6380` to avoid clashing with
other local stacks that often occupy `5432`/`6379`.
