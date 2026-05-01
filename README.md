# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control.

## Tech Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React (Vite)
- **Auth**: JWT
- **Deployment**: Railway

---

## Features

- 🔐 **Authentication** — Signup/Login with JWT
- 📁 **Project Management** — Create projects, invite team members
- 👥 **Role-Based Access** — Admin (full control) / Member (view + update status)
- ✅ **Task Management** — Create, assign, track tasks with status & priority
- 📊 **Dashboard** — Personal task overview with stats and overdue alerts
- 🗂️ **Kanban View** — Tasks organized by Todo / In Progress / Done

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm install
npm run migrate   # Creates all tables
npm run dev       # Starts on port 5000
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:5000/api
npm install
npm run dev       # Starts on port 5173
```

---

## Railway Deployment

### Step 1: Database
1. Create a new project on [Railway](https://railway.app)
2. Add a **PostgreSQL** service
3. Copy the `DATABASE_URL` from the PostgreSQL service

### Step 2: Backend
1. Add a new service → **Deploy from GitHub repo** → select your repo
2. Set **Root Directory** to `backend`
3. Add environment variables:
   ```
   DATABASE_URL=<from PostgreSQL service>
   JWT_SECRET=<random long string>
   NODE_ENV=production
   FRONTEND_URL=<your frontend URL after deploying>
   ```
4. After deploy, run migration:
   - In Railway terminal: `npm run migrate`

### Step 3: Frontend
1. Add another service → **Deploy from GitHub repo** → same repo
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   ```
   VITE_API_URL=<your backend Railway URL>/api
   ```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Projects
| Method | Path | Access |
|--------|------|--------|
| GET | `/api/projects` | All members |
| POST | `/api/projects` | Authenticated |
| GET | `/api/projects/:id` | Members |
| PUT | `/api/projects/:id` | Admin |
| DELETE | `/api/projects/:id` | Admin |
| POST | `/api/projects/:id/members` | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Admin |

### Tasks
| Method | Path | Access |
|--------|------|--------|
| GET | `/api/projects/:id/tasks` | Members |
| POST | `/api/projects/:id/tasks` | Members |
| PUT | `/api/projects/:id/tasks/:taskId` | Members (status only) / Admin (full) |
| DELETE | `/api/projects/:id/tasks/:taskId` | Admin |
| GET | `/api/dashboard` | Authenticated |

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/       # DB connection + migrations
│   │   ├── controllers/  # Auth, Projects, Tasks
│   │   ├── middleware/   # JWT auth + RBAC
│   │   ├── routes/       # Express routers
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # Layout, Modal
    │   ├── context/      # AuthContext
    │   ├── pages/        # Login, Dashboard, Projects, ProjectDetail
    │   └── utils/        # Axios API instance
    └── vite.config.js
```
