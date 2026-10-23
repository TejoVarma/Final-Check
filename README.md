# Final Checks — Feature Requests

Users suggest features for a product, upvote them, and track them through Under Review → Planned → In Progress → Done.

| Folder      | Stack                          | Deploys to            |
|-------------|--------------------------------|-----------------------|
| `backend/`  | Python, FastAPI, Supabase      | AWS Elastic Beanstalk |
| `frontend/` | React, TypeScript, Vite        | AWS Amplify           |

## Versions
- **Python 3.12** (`backend/.python-version`)
- **Node 22** (`.nvmrc`, `frontend/.nvmrc`, `engines` in `frontend/package.json`) — run `nvm use` before working on the frontend

## Database setup (one time)
Open your Supabase project → **SQL Editor** → paste and run [`backend/supabase/schema.sql`](backend/supabase/schema.sql).
It creates the `feature_requests` table and the `increment_votes` function used for atomic upvotes.

## Local development

### Backend
```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in SUPABASE_URL and SUPABASE_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```
Tests: `pip install -r requirements-dev.txt && pytest` (no database needed; they use an in-memory fake).

API docs: http://localhost:8000/docs · Health: http://localhost:8000/api/health

### Frontend
```bash
cd frontend
nvm use
npm install
npm run dev
npm test        # store tests (Vitest)
```
State lives in a Zustand store: `src/store/featureRequests.ts`.
App: http://localhost:5173. The UI calls relative `/api/...` paths; Vite proxies them to the backend on `localhost:8000` (see `vite.config.ts`), so run the backend too.

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/requests?sort=votes\|newest` | | Default `votes`; ties broken by newest |
| POST | `/api/requests` | `{title, description?, category}` | Title 1–120 chars; category `UI`/`Performance`/`Integration`/`Other`. Starts at 0 votes, `Under Review` |
| POST | `/api/requests/{id}/upvote` | | +1 vote |
| PATCH | `/api/requests/{id}/status` | `{status}` | Must be the next step in the flow, else `409` |
| DELETE | `/api/requests/{id}` | | `204` |

## Deployment

Request path in production — the browser only ever talks to the Amplify domain:

```
Browser ──HTTPS──▶ Amplify (https://<app>.amplifyapp.com)
                     ├─ /api/*  ──rewrite (200 proxy)──▶ CloudFront (HTTPS) ──HTTP──▶ Elastic Beanstalk
                     └─ /*      ──▶ index.html (React app)
```

Deploy in this order: Beanstalk → CloudFront → Amplify.

### 1. Backend → Elastic Beanstalk
- Platform: **Python 3.12 running on 64bit Amazon Linux 2023** (`eb init -p python-3.12`). The `Procfile` runs gunicorn + uvicorn workers on port 8000 (nginx on EB proxies to it).
- Build the source bundle: `./backend/package.sh` → `backend/dist/backend-<git-sha>.zip` (only `Procfile`, `requirements.txt` and `app/`; never `.env`).
  Upload it in the EB console (**Upload and deploy**), or deploy from `backend/` with the EB CLI: `eb init` → `eb create` → `eb deploy`.
- Environment properties (Configuration → Updates, monitoring and logging → Environment properties):
  `ENVIRONMENT=production`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
  `CORS_ORIGINS` is not needed: the browser sees one origin (the Amplify domain), so no cross-origin requests happen.
- Check: `http://<env>.<region>.elasticbeanstalk.com/api/health`

### 2. HTTPS → CloudFront in front of Beanstalk
Create a distribution with these settings (the defaults will break the API):

| Setting | Value | Why |
|---|---|---|
| Origin domain | `<env>.<region>.elasticbeanstalk.com` | |
| Origin protocol | **HTTP only**, port 80 | EB has no HTTPS listener |
| Viewer protocol policy | Redirect HTTP to HTTPS | |
| Allowed HTTP methods | **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** | Default is GET/HEAD only, which blocks submit/upvote/status/delete |
| Cache policy | **CachingDisabled** | Otherwise vote counts and lists are served stale |
| Origin request policy | **AllViewerExceptHostHeader** | Forwards query strings (`?sort=`), headers and body |

- Check: `https://<id>.cloudfront.net/api/health`

### 3. Frontend → Amplify
- Connect the GitHub repo; Amplify picks up `amplify.yml` (monorepo, app root `frontend`, Node 22). No environment variables needed.
- **Rewrites and redirects → Manage**: add these rules in this order (the `/api` rule must be **first**):

  | Source | Target | Type |
  |---|---|---|
  | `/api/<*>` | `https://<cloudfront-domain>/api/<*>` | 200 (Rewrite) |
  | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | 200 (Rewrite) |
- Check: `https://<branch>.<app-id>.amplifyapp.com/api/health`, then `/api/requests?sort=newest` to confirm query strings pass through the rewrite.

## Secrets
`.env` files are git-ignored. The Supabase **secret key** is backend-only and must never be put in the frontend.
