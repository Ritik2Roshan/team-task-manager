# Team Task Manager

Full-stack team task manager with projects, tasks, JWT authentication, and role-based access (global **admin** vs **member**). Backend uses Express + `mysql2`; frontend uses React (Vite) + Tailwind CSS v4.

**Live URLs (after you deploy):**

- Frontend: `https://YOUR_FRONTEND_SERVICE.up.railway.app` (or your static host)
- Backend API: `https://YOUR_BACKEND_SERVICE.up.railway.app`

Replace placeholders with the URLs from your Railway (or other) dashboard, then set the frontend `VITE_API_URL` to `https://YOUR_BACKEND.../api` before building the static site.

---

## Prerequisites

- Node.js 18+
- MySQL 8 (local or Railway plugin)

---

## 1. Database (local)

From the project root:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Default seeded **admin** (change password after first login in production):

| Field    | Value                         |
| -------- | ----------------------------- |
| Email    | `admin@taskmanager.local`     |
| Password | `Adminpass8`                  |

New accounts from **Sign up** are always **member**. To promote a user to admin in SQL:

```sql
USE taskmanager_db;
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

---

## 2. Backend

```bash
cd backend
cp .env.example .env   # or edit .env — see variables below
npm install
npm start
```

API runs at `http://localhost:5000` by default.

### Backend `.env`

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=taskmanager_db
JWT_SECRET=use_a_long_random_string_in_production
PORT=5000
```

On Railway, point these at the MySQL plugin (or `MYSQL_URL` split into the above). **Do not commit real secrets.**

---

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Vite dev server defaults to `http://localhost:5173` with a proxy to `/api` → `http://localhost:5000`.

For production build, set `VITE_API_URL` to your deployed API base including `/api`, for example:

```
VITE_API_URL=https://your-api.up.railway.app/api
```

Then:

```bash
npm run build
```

Serve the `frontend/dist` folder as a static site.

---

## 4. Testing APIs (Postman or similar)

1. **Login** — `POST http://localhost:5000/api/auth/login`  
   Body (JSON): `{ "email": "admin@taskmanager.local", "password": "Adminpass8" }`  
   Copy `token` from the response.

2. For protected routes, add header:  
   `Authorization: Bearer <token>`

3. Try in order:

   - `GET /api/dashboard`
   - `GET /api/projects`
   - `POST /api/projects` (any logged-in user) — `{ "name": "...", "description": "..." }`
   - `GET /api/projects/:id`
   - `POST /api/projects/:id/members` — `{ "user_id": 2, "role": "member" }`
   - `POST /api/projects/:id/upload` — form-data, key `files`, type File (add multiple rows or folder upload from the app UI)
   - `POST /api/tasks` — include `title`, `description`, `project_id`, optional `assigned_to`, `status`, `priority`, `due_date`
   - `GET /api/tasks?project_id=1&status=todo`
   - `GET /api/tasks/overdue`
   - `PUT /api/tasks/:id` — members may only send `status` for tasks assigned to them; admins can send full fields.

Use **raw JSON** bodies (not form-data) to avoid parse errors.

---

## 5. Deploying to Railway

### Backend (Node)

1. New **Empty** project → **Deploy from GitHub** (or CLI) with root `backend/`.
2. Set start command: `npm start` (or `node server.js`).
3. Add **MySQL** plugin; create tables using `database/schema.sql` (Railway provides connection vars — map them to `DB_*` in the service variables).
4. Set `JWT_SECRET`, `PORT` (Railway sets `PORT` automatically — use `process.env.PORT` which the app already does).

### Frontend (static)

1. New **Static** service from `frontend/` (or build in CI and upload `dist`).
2. Build command: `npm install && npm run build`.
3. Publish directory: `dist`.
4. Environment variable at build time: `VITE_API_URL=https://<your-backend-host>/api`.

### CORS

The API uses `cors({ origin: true })` so your Railway frontend origin is accepted. Tighten `origin` to your exact frontend URL in production if you prefer.

---

## API summary

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/users` | Admin |
| GET | `/api/users/:id` | Self or admin |
| GET | `/api/projects` | Auth |
| POST | `/api/projects` | Any logged-in user (becomes `owner_id`) |
| GET/PUT/DELETE | `/api/projects/:id` | GET: member of project; PUT/DELETE: global admin **or project owner** |
| GET | `/api/projects/:id/files` | List uploaded files (project members) |
| POST | `/api/projects/:id/upload` | Multipart `files` field (multiple); preserves folder paths when using folder upload |
| GET | `/api/projects/:id/files/:fileId/download` | Download (auth header) |
| DELETE | `/api/projects/:id/files/:fileId` | Uploader, project owner, or global admin |
| POST | `/api/projects/:id/members` | Admin or project owner |
| GET | `/api/tasks` | Query: `project_id`, `status`, `priority` |
| POST | `/api/tasks` | Auth; **project owners** / **project admins** / **global admin** can assign to any project member; other members only to self or unassigned |
| GET | `/api/tasks/overdue` | Auth |
| GET/PUT/DELETE | `/api/tasks/:id` | Assignees update status; project/global managers can edit fields & reassign |
| GET | `/api/dashboard` | Task stats + **`projects_count`** + **`recent_projects`** (for UI links) |

---

## Assignment submission checklist

| Requirement | Status |
|-------------|--------|
| Auth (signup / login), JWT, validations | Implemented |
| Projects & team members | Implemented |
| Tasks: create, assign, status, priority, due dates, filters | Implemented |
| Dashboard (tasks + **project count** + recent projects) | Implemented |
| RBAC (global Admin/Member + project owner / project admin for tasks) | Implemented |
| REST API + MySQL + relationships | Implemented |
| File & **folder** upload per project | Implemented |
| **Deployment (Railway)** | You deploy: see Railway section above; set env vars and `VITE_API_URL` |
| **Live URL** | Add after deploy |
| **GitHub repo** | Push this project to your account |
| **README** | This file |
| **2–5 min demo video** | Record after deploy (login, project, task, dashboard, upload) |

---

## Project layout

```
team-task-manager/
  backend/           # Express API
  frontend/          # Vite + React + Tailwind
  database/          # schema.sql, seed.sql
  README.md
```

---

## Security notes

- Rotate the example MySQL password and JWT secret for any shared or production environment.
- Sign-up registers **member** only; use SQL or a controlled process to grant **admin**.
