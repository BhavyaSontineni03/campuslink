# CampusLink free deploy guide

This walks through a free-tier live demo:

| Piece | Service | What you get |
|---|---|---|
| Postgres | [Neon](https://neon.tech) | Free cloud database |
| Redis | [Upstash](https://upstash.com) | Free Redis |
| API + WebSockets | [Render](https://render.com) | Free web service (sleeps when idle) |
| Frontend | [Vercel](https://vercel.com) | Free static / React hosting |

**Time:** about 45-90 minutes the first time.
**Cost:** $0 on free tiers (Render may sleep after about 15 minutes idle; first load can take 30-60s).

Do these steps **in order**. Keep a notes file for URLs and passwords.

---

## Before you start

1. Confirm the app runs locally (see the README quick start).
2. Create free accounts on:
   - [github.com](https://github.com)
   - [neon.tech](https://neon.tech)
   - [upstash.com](https://upstash.com)
   - [render.com](https://render.com) (sign in with GitHub when ready)
   - [vercel.com](https://vercel.com) (sign in with GitHub when ready)
3. Generate a long random JWT secret (you will paste it into Render):

```bash
openssl rand -hex 32
```

Save the output. Call it `JWT_SECRET`.

---

## Step 1: Create Neon Postgres

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up / log in.
2. Click **New Project**.
3. Name it `campuslink` (any name is fine).
4. Pick a region close to you (for example, US East).
5. Create the project.
6. On the project dashboard, find **Connection string**.
7. Choose a **Connection string** that looks like:

```text
postgresql://USER:PASSWORD@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

8. Copy it somewhere safe. This is your `DATABASE_URL`.
9. Prefer the **pooled** connection string if Neon shows one (good for free tier).

### Step 1b: Create tables (schema)

Neon starts empty. You must run CampusLink SQL.

1. In Neon, open the **SQL Editor**.
2. Open these files from the repo (in this order) and paste each into the SQL Editor, then **Run**:

| Order | File |
|---|---|
| 1 | `database/init/01-schema.sql` |
| 2 | `database/init/05-notifications.sql` |
| 3 | `database/init/06-favorites.sql` |
| 4 | `database/init/07-engagement.sql` |

Skip `04-seed.sql` if you will use `npm run seed` later (recommended). If `04-seed.sql` conflicts with the Node seed, prefer the Node seed only.

3. Confirm tables exist (SQL Editor):

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
```

You should see tables such as `users`, `sessions`, `reservations`, `user_interactions`, and `funnel_events`.

---

## Step 2: Create Upstash Redis

1. Go to [https://console.upstash.com](https://console.upstash.com) and sign up / log in.
2. Click **Create Database** (Redis).
3. Name: `campuslink`.
4. Type: regional is fine. Pick a region near Neon if possible.
5. Create it.
6. Open the database, then **Details**.
7. Copy the **Redis URL** that starts with `rediss://...` (the extra `s` means TLS).
8. Save it as `REDIS_URL`.

---

## Step 3: Push the code to GitHub

Render and Vercel both deploy from GitHub, so the repo must exist before Steps 4 and 5.

1. Create a new empty repo named **`campuslink`** (Public).
2. Do not add a README on GitHub if this project already has one.
3. From the project folder on your machine:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/campuslink.git
git push -u origin main
```

---

## Step 4: Deploy the API on Render

### 4a: New Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. **New +** then **Web Service**.
3. Connect your GitHub account and select the **`campuslink`** repo.
4. Settings:

| Field | Value |
|---|---|
| Name | `campuslink-api` |
| Region | same area as Neon if possible |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance type | **Free** |

5. Click **Advanced**, then **Add Environment Variable** for each:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render often sets PORT automatically; if they inject `PORT`, you can omit this) |
| `DATABASE_URL` | *(paste Neon connection string)* |
| `DB_SSL` | `true` |
| `REDIS_URL` | *(paste Upstash `rediss://...` URL)* |
| `JWT_SECRET` | *(your openssl secret)* |
| `CORS_ORIGIN` | `http://localhost:3000` for now. Update this after Vercel gives you a URL. |

6. Create the Web Service and wait for the first deploy (several minutes).

### 4b: Confirm the API is alive

1. Render gives you a URL like:

```text
https://campuslink-api.onrender.com
```

2. Open in a browser:

```text
https://campuslink-api.onrender.com/health
```

3. You want JSON roughly like:

```json
{ "success": true, "status": "OK", "database": "connected", "redis": "connected" }
```

If `database` is not connected, re-check `DATABASE_URL` and that schema SQL ran.
If `redis` is not connected, re-check `REDIS_URL` (`rediss://`).

**Free tier note:** after idle time the service sleeps. The first request after sleep can take about 30-60 seconds. That is normal.

### 4c: Seed demo data on Render

Run seed from your laptop against Neon (or use Render Shell if it is available):

```bash
cd backend
export DATABASE_URL='paste-neon-url-here'
export REDIS_URL='paste-upstash-url-here'
export JWT_SECRET='your-secret'
npm run seed
```

When seed finishes you should see demo logins printed (`alice@campus.edu`, and others).

Optional offline metrics (local only is fine):

```bash
npm run simulate
```

---

## Step 5: Deploy the frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com), then **Add New…**, then **Project**.
2. Import the **`campuslink`** GitHub repo.
3. Configure:

| Field | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` (click Edit, then select `frontend`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. **Environment Variables** (Production):

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://campuslink-api.onrender.com/api` |
| `VITE_WS_URL` | `wss://campuslink-api.onrender.com/ws` |

Replace the host with **your** Render URL.
Use `https` for API and `wss` (secure WebSocket) for WS.

5. Deploy.
6. Vercel gives you a URL like:

```text
https://campuslink-xxxx.vercel.app
```

---

## Step 6: Connect frontend and backend (CORS)

1. Copy your Vercel URL (no trailing slash), for example `https://campuslink-xxxx.vercel.app`
2. Go back to Render, then `campuslink-api`, then **Environment**
3. Edit `CORS_ORIGIN` to:

```text
https://campuslink-xxxx.vercel.app,http://localhost:3000
```

4. Save. Render redeploys automatically.
5. Wait until deploy finishes.

---

## Step 7: Smoke test the live app

1. Open the Vercel URL.
2. Wait if Render is waking up (first load can be slow).
3. Log in: `alice@campus.edu` / `password123`
4. Check:
   - Home shows sessions
   - Sessions search for `fitness` (or another tag) returns results
5. Log out, then log in as `organizer@campus.edu` / `password123`
6. Open **Analytics**. Funnel and bandit panels should load.

If login fails with a network or CORS error:
- Confirm `CORS_ORIGIN` includes the exact Vercel origin (https, no path)
- Confirm `VITE_API_URL` ends with `/api`
- Hard-refresh the browser (or try incognito)

---

## Step 8: Put the live link on the README

After deploy works, add this near the top of `README.md`:

```markdown
**Live demo:** https://campuslink-xxxx.vercel.app
```

Then commit and push.

---

## Step 9: GitHub polish

1. Repo name: `campuslink`
2. About description: `Campus event engagement: personalized ranking, Postgres FTS, Thompson Sampling reminders`
3. Topics: `typescript`, `react`, `nodejs`, `postgresql`, `redis`, `websockets`
4. Optional screenshots: `docs/assets/home.png` and `docs/assets/analytics.png`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Health `database: failed` | Wrong `DATABASE_URL`, or schema SQL not applied, or SSL missing (`DB_SSL=true`, `sslmode=require`) |
| Health `redis: failed` | Use Upstash `rediss://` URL, not `redis://` |
| Frontend loads but API errors | `VITE_API_URL` wrong; redeploy Vercel after changing env vars |
| CORS errors in browser console | `CORS_ORIGIN` must exactly match Vercel URL |
| Site works once then wakes slowly | Render free sleep. Expected. |
| Seed fails | `DATABASE_URL` exported in the same terminal; run from `backend/` |
| WebSockets not updating | `VITE_WS_URL` must be `wss://.../ws` on HTTPS sites |

---

## Security reminders

- Never paste real secrets into the public README
- Never commit `.env`
- Rotate `JWT_SECRET` if it ever leaks
- Demo password `password123` is fine for a portfolio seed; do not reuse it elsewhere
