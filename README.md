# RedditAutoPost 🤖

**AI-assisted Reddit content tool** — monitors subreddits, drafts natural replies with Claude, and only publishes what you approve.

See [`PLAN.md`](./PLAN.md) for the full product/technical plan.

## Stack

| Layer    | Tech                          |
| -------- | ----------------------------- |
| Frontend | React 18 + Vite               |
| Backend  | Node.js + Express (ES modules)|
| DB       | PostgreSQL                    |
| AI       | Claude API (Anthropic)        |
| Reddit   | OAuth 2.0 + Reddit API (fetch)|
| Cron     | node-cron                     |

## Project structure

```
RedditAutopost/
├── backend/
│   ├── db/                  # schema.sql + migrate script
│   └── src/
│       ├── config/          # env + pg pool
│       ├── routes/          # express routers
│       ├── controllers/     # route handlers
│       ├── models/          # SQL data access (User, Post, Subreddit, RedditAuth)
│       ├── middleware/      # auth guard
│       ├── jobs/            # cron: monitor, redact, publish, stats
│       └── utils/           # claudeAPI, redditAPI, encryption, logger
└── frontend/
    └── src/
        ├── pages/           # Dashboard, ApprovedPosts, SubredditConfig, Analytics, Settings
        ├── components/      # PostCard, ApprovalModal, StatsBadge, SubredditList, Layout
        └── services/        # api client, reddit auth
```

## Getting started

### 1. Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run db:migrate
npm run dev            # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :4000)
```

## Environment (backend `.env`)

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | From https://www.reddit.com/prefs/apps (type: *web app*, redirect URI `http://localhost:4000/api/auth/callback`) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SESSION_SECRET` | Random string for signing the session cookie |
| `ENCRYPTION_KEY` | 32-byte hex (`openssl rand -hex 32`) — encrypts stored Reddit tokens |
| `APP_URL` / `FRONTEND_URL` | e.g. `http://localhost:4000` / `http://localhost:5173` |

## How it works

1. **Every 6h** — scans monitored subreddits, filters relevant posts with Claude, stores candidates.
2. **Every 15m** — drafts replies for candidates (value-first, subtle mention, spam-risk check).
3. **You review** — approve / edit / reject in the dashboard.
4. **Publish** — approved posts go out (on click or via hourly cron, respecting your daily frequency cap).
5. **Every hour** — tracks upvotes/comments/engagement per published post.

> ⚠️ Human-in-the-loop by design: nothing is published without your approval, which keeps you on the right side of Reddit's self-promotion rules.
