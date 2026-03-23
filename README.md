# CollabEditor — Real-Time Collaborative Document Editor

A full-stack collaborative editing app where multiple users can edit the same document simultaneously with live cursor presence, version history, and conflict-free merging via **Yjs CRDT**.

---

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18, React Quill, Socket.IO client       |
| Real-time  | Yjs CRDT, y-quill, Socket.IO                  |
| Backend    | Node.js, Express, Socket.IO                   |
| Database   | MongoDB (Atlas)                               |
| Cache      | Redis (optional — app works without it)       |
| Auth       | JWT (access + refresh tokens, HttpOnly cookie)|
| Logging    | Winston                                       |
| CI/CD      | GitHub Actions                                |
| Hosting    | Vercel (frontend) + Render (backend)          |

---

## Project Structure

```
collab-editor/
├── backend/
│   ├── src/
│   │   ├── controllers/       # authController, documentController
│   │   ├── middleware/         # auth.js (JWT verification)
│   │   ├── models/             # User, Document, DocumentVersion
│   │   ├── routes/             # auth, documents, profile
│   │   ├── socket/             # Socket.IO + Yjs CRDT handler
│   │   └── utils/              # db, redis, logger, snapshotJob, metrics
│   ├── tests/                  # Jest + supertest integration tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/           # Login, Register
│   │   │   ├── Dashboard/      # Document list
│   │   │   └── Editor/         # Quill editor, CursorOverlay, VersionHistory, ShareModal
│   │   ├── context/            # AuthContext
│   │   ├── hooks/              # useDocument (Yjs + socket wiring)
│   │   ├── pages/              # EditorPage
│   │   ├── services/           # api.js, socket.js, documents.js
│   │   └── utils/              # base64.js
│   ├── vercel.json             # SPA routing config for Vercel
│   └── package.json
├── .github/workflows/
│   └── ci-cd.yml               # Run tests on every push
└── README.md
```

---

## Local Development (Windows)

### Prerequisites
- [Node.js 20 LTS](https://nodejs.org/)
- [MongoDB Community](https://www.mongodb.com/try/download/community)
- Redis is **optional** — the app runs without it in single-instance mode

### 1. Clone and install

```powershell
git clone https://github.com/YOUR_USERNAME/collab-editor.git
cd collab-editor
npm run install:all
```

### 2. Configure environment

```powershell
# Backend
copy backend\.env.example backend\.env
# Open backend\.env and set JWT_SECRET and JWT_REFRESH_SECRET

# Frontend
copy frontend\.env.example frontend\.env
```

### 3. Start

```powershell
# Terminal 1 — MongoDB
mongod

# Terminal 2 — app (backend + frontend together)
npm run dev
```

Frontend → **http://localhost:3000** | Backend → **http://localhost:5000**

---

## Deploying to Production

### Overview

```
GitHub push to main
        │
        ├── GitHub Actions runs tests
        │
        ├── Frontend → Vercel     (automatic, instant, no cold starts)
        └── Backend  → Render     (automatic, ~50s cold start on free tier)
```

---

### Step 1 — MongoDB Atlas (database)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free cluster
2. Create a database user with a strong password
3. Under **Network Access** add `0.0.0.0/0` (required for Render)
4. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/collab-editor
   ```

---

### Step 2 — Deploy backend to Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo and set **Root Directory** to `backend`
3. Set the build and start commands:
   ```
   Build command:  npm ci --only=production
   Start command:  node src/index.js
   ```
4. Add these environment variables in the Render dashboard:

| Variable                  | Value                                               |
|---------------------------|-----------------------------------------------------|
| `NODE_ENV`                | `production`                                        |
| `MONGO_URI`               | Your MongoDB Atlas connection string                |
| `JWT_SECRET`              | Any random string, 32+ characters                  |
| `JWT_REFRESH_SECRET`      | A different random string, 32+ characters           |
| `JWT_EXPIRES_IN`          | `15m`                                               |
| `JWT_REFRESH_EXPIRES_IN`  | `7d`                                                |
| `CLIENT_URL`              | `https://your-app.vercel.app` (set after step 3)    |
| `SNAPSHOT_INTERVAL`       | `30`                                                |
| `MAX_VERSIONS_PER_DOC`    | `50`                                                |

5. Deploy — your backend URL will be `https://your-service.onrender.com`

> **Note on cold starts:** Render's free tier spins down after 15 minutes of inactivity and takes ~50 seconds to wake up on the first request. To avoid this, upgrade to the $7/month paid tier or switch to [Railway](https://railway.app) which has no cold starts and a generous free tier.

---

### Step 3 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo and set **Root Directory** to `frontend`
3. Framework preset: **Create React App**
4. Add these environment variables:

| Variable             | Value                                  |
|----------------------|----------------------------------------|
| `REACT_APP_API_URL`  | `https://your-service.onrender.com`    |
| `REACT_APP_WS_URL`   | `https://your-service.onrender.com`    |

5. Deploy — your frontend URL will be `https://your-app.vercel.app`
6. Go back to **Render** and update `CLIENT_URL` to your Vercel URL, then redeploy the backend

---

### Step 4 — GitHub Actions (CI)

The pipeline runs automatically on every push to `main`. It runs your full test suite against real MongoDB and Redis instances to catch regressions before they reach production.

Add these secrets in GitHub → **Settings → Secrets and variables → Actions**:

| Secret               | Description                          |
|----------------------|--------------------------------------|
| `JWT_SECRET`         | Same value as your Render env var    |
| `JWT_REFRESH_SECRET` | Same value as your Render env var    |

Both Vercel and Render watch your GitHub repo and deploy automatically on every push to `main` — the CI pipeline just ensures tests pass first.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable                  | Default                                    | Description                    |
|---------------------------|--------------------------------------------|--------------------------------|
| `PORT`                    | `5000`                                     | Server port                    |
| `MONGO_URI`               | `mongodb://localhost:27017/collab-editor`  | MongoDB connection string       |
| `REDIS_HOST`              | `localhost`                                | Redis host (optional)          |
| `REDIS_PORT`              | `6379`                                     | Redis port (optional)          |
| `JWT_SECRET`              | —                                          | **Required** — 32+ char string |
| `JWT_EXPIRES_IN`          | `15m`                                      | Access token lifetime          |
| `JWT_REFRESH_SECRET`      | —                                          | **Required** — 32+ char string |
| `JWT_REFRESH_EXPIRES_IN`  | `7d`                                       | Refresh token lifetime         |
| `CLIENT_URL`              | `http://localhost:3000`                    | Allowed CORS origin            |
| `SNAPSHOT_INTERVAL`       | `30`                                       | Version snapshot frequency (s) |
| `MAX_VERSIONS_PER_DOC`    | `50`                                       | Max stored versions per doc    |

### Frontend (`frontend/.env`)

| Variable             | Default                  | Description               |
|----------------------|--------------------------|---------------------------|
| `REACT_APP_API_URL`  | `http://localhost:5000`  | Backend base URL          |
| `REACT_APP_WS_URL`   | `http://localhost:5000`  | WebSocket server URL      |

---

## API Reference

### Auth

| Method | Route                          | Body                          | Description           |
|--------|--------------------------------|-------------------------------|-----------------------|
| POST   | `/api/auth/register`           | `{username, email, password}` | Register new user     |
| POST   | `/api/auth/login`              | `{email, password}`           | Login                 |
| POST   | `/api/auth/refresh`            | —                             | Refresh access token  |
| POST   | `/api/auth/logout`             | —                             | Logout                |
| GET    | `/api/profile`                 | —                             | Get own profile       |
| GET    | `/api/profile/lookup?email=x`  | —                             | Look up user by email |

### Documents (all require `Authorization: Bearer <token>`)

| Method | Route                                    | Description                  |
|--------|------------------------------------------|------------------------------|
| GET    | `/api/documents`                         | List my documents            |
| POST   | `/api/documents`                         | Create document              |
| GET    | `/api/documents/:id`                     | Get document                 |
| PATCH  | `/api/documents/:id`                     | Update title / visibility    |
| DELETE | `/api/documents/:id`                     | Delete document              |
| POST   | `/api/documents/:id/collaborators`       | Add collaborator             |
| DELETE | `/api/documents/:id/collaborators/:uid`  | Remove collaborator          |
| GET    | `/api/documents/:id/versions`            | List version history         |
| POST   | `/api/documents/:id/restore/:versionId`  | Restore a version            |

### Socket.IO Events

| Direction       | Event               | Payload                                     |
|-----------------|---------------------|---------------------------------------------|
| Client → Server | `join-document`     | `{ documentId }`                            |
| Client → Server | `send-changes`      | `{ documentId, update }` (base64 Yjs)       |
| Client → Server | `cursor-move`       | `{ documentId, position }`                  |
| Client → Server | `title-change`      | `{ documentId, title }`                     |
| Server → Client | `load-document`     | `{ yjsUpdate, content, title }`             |
| Server → Client | `receive-changes`   | `{ update }` (base64 Yjs)                   |
| Server → Client | `user-joined`       | `{ userId, username, color, activeUsers }`  |
| Server → Client | `user-left`         | `{ userId, username }`                      |
| Server → Client | `cursor-move`       | `{ userId, username, color, position }`     |
| Server → Client | `title-changed`     | `{ title }`                                 |
| Server → Client | `document-restored` | `{ content, versionId }`                    |

---

## Running Tests

```powershell
cd backend
npm test

# With coverage report
npm run test:coverage
```

---

## Monitoring

- **Health check:** `GET /healthz` — returns uptime and timestamp
- **Metrics:** `GET /metrics` — Prometheus-format metrics (request counts, durations, active WebSockets, document edits)
- **Logs:** Winston structured logging to console and `backend/logs/`