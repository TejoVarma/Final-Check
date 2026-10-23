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
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev
```
App: http://localhost:5173

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/requests?sort=votes\|newest` | | Default `votes`; ties broken by newest |
| POST | `/api/requests` | `{title, description?, category}` | Title 1–120 chars; category `UI`/`Performance`/`Integration`/`Other`. Starts at 0 votes, `Under Review` |
| POST | `/api/requests/{id}/upvote` | | +1 vote |
| PATCH | `/api/requests/{id}/status` | `{status}` | Must be the next step in the flow, else `409` |
| DELETE | `/api/requests/{id}` | | `204` |

## Deployment

### Backend → Elastic Beanstalk
- Platform: **Python 3.12 running on 64bit Amazon Linux 2023** (`eb init -p python-3.12`). The `Procfile` runs gunicorn + uvicorn workers on port 8000 (nginx on EB proxies to it).
- Deploy from `backend/`: `eb init` → `eb create` → `eb deploy`.
- Set environment properties in EB (Configuration → Updates, monitoring and logging → Environment properties):
  `ENVIRONMENT=production`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CORS_ORIGINS=https://<branch>.<app-id>.amplifyapp.com`
- **HTTPS is required**: Amplify serves over HTTPS, so browsers block calls to a plain-HTTP EB URL. Add an HTTPS listener (ACM certificate) on the EB load balancer, typically with a custom domain like `api.yourdomain.com`.

### Frontend → Amplify
- Connect the Git repo in Amplify; it picks up `amplify.yml` (app root = `frontend`). Enable "monorepo" and set app root to `frontend` if prompted. The build runs on Node 22 (set in `amplify.yml`).
- Environment variable: `VITE_API_URL=https://<your-backend-domain>`
- For client-side routing, add a rewrite: source `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>` → target `/index.html` → type `200 (Rewrite)`.

## Secrets
`.env` files are git-ignored. The Supabase **secret key** is backend-only and must never be put in the frontend.
