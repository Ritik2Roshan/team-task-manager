# Team Task Manager

Full-stack team task manager with projects, tasks, JWT authentication, and role-based access (global **admin** vs **member**). Backend uses Express + `mysql2`; frontend uses React (Vite) + Tailwind CSS v4.

**Live URLs (after you deploy):**

- App: `https://YOUR_RAILWAY_APP.up.railway.app`
- Backend API: `https://YOUR_RAILWAY_APP.up.railway.app`

The Railway deployment in this repo serves the built frontend from the Express server, so the browser and API share the same origin.

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

On Railway, the backend also accepts the native MySQL variables automatically: `MYSQL_URL`, `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE`. **Do not commit real secrets.**

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

### One-service deployment

1. Deploy the repository root to Railway.
2. Railway will run the root `build` script, which installs backend/frontend dependencies and builds the frontend.
3. The root `start` script launches the backend, and Express serves the built frontend from `frontend/dist`.
4. Add a MySQL service in the same Railway project and provide its variables to the app service (the backend reads `MYSQL_URL` or `MYSQLHOST`/`MYSQLPORT`/`MYSQLUSER`/`MYSQLPASSWORD`/`MYSQLDATABASE`).
5. Set `JWT_SECRET` and let Railway inject `PORT`.

If you prefer the older split-service approach, you can still deploy `frontend/` and `backend/` separately, but it is no longer required.

### CORS

The API uses `cors({ origin: true })`, but same-origin deployment means CORS is usually a non-issue.

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
