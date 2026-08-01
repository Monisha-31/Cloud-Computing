# Complaint Management System

A full-stack complaint management system with three roles: **User**, **Staff**, and **Admin**.

- **User** — submits complaints, tracks status, comments on their own complaints.
- **Staff** — belongs to one department (Billing, Technical, Service Quality, HR, General) and
  manages the queue of complaints filed under that category: update status, add resolution notes, comment.
- **Admin** — sees everything, views summary stats, manually assigns complaints to staff,
  creates/disables staff & admin accounts.

## Tech stack
- **Frontend:** plain HTML, CSS, JavaScript (no framework/build step)
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT, passwords hashed with bcrypt

## Project structure
```
cms/
  backend/
    config/db.js            MongoDB connection
    models/                 User.js, Complaint.js (Mongoose schemas)
    middleware/auth.js      JWT verification + role guard
    controllers/            request handlers (auth, complaints, users)
    routes/                 Express route definitions
    server.js                app entry point — also serves the frontend
    seedAdmin.js             creates the first admin account
    package.json
    .env.example
  frontend/
    index.html               login
    register.html             user sign-up
    user-dashboard.html       submit + track complaints
    staff-dashboard.html      department queue
    admin-dashboard.html      stats, all complaints, user management
    css/style.css
    js/api.js                 shared fetch/auth helper
```

## Setup

1. **Install MongoDB** locally, or use a free MongoDB Atlas cluster.

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `MONGO_URI` (and a strong `JWT_SECRET`).

4. **Create the first admin account:**
   ```bash
   node seedAdmin.js
   ```
   This creates `admin@example.com` / `admin123`. A "change password" flow isn't built in yet —
   for a class project it's fine to mention that as a known limitation, or add it as an extension.

5. **Start the server:**
   ```bash
   npm start
   ```
   (or `npm run dev` if you installed nodemon, for auto-restart on changes)

6. **Open the app:** go to `http://localhost:5000` in your browser. The Express server serves the
   frontend directly, so frontend and backend run from a single process — no separate frontend server needed.

## How the roles connect

- New sign-ups via `register.html` always become a `user`.
- The seeded admin (or any existing admin) creates `staff` and additional `admin` accounts from
  the **Users** tab on the admin dashboard — staff accounts require picking a department.
- A complaint's `category` field determines which department's staff can see and act on it — that's
  the routing logic tying users, complaints, and staff together.

## API summary

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Logged in |
| POST | /api/complaints | Logged in |
| GET | /api/complaints | Logged in (scoped by role) |
| GET | /api/complaints/:id | Owner / assigned staff / admin |
| PATCH | /api/complaints/:id/status | Staff (own dept) / Admin |
| PATCH | /api/complaints/:id/assign | Admin |
| POST | /api/complaints/:id/comments | Owner / assigned staff / admin |
| GET | /api/complaints/stats/overview | Admin |
| GET | /api/users | Admin |
| GET | /api/users/staff | Admin |
| POST | /api/users | Admin |
| PATCH | /api/users/:id/status | Admin |

## Possible extensions for your report
- File attachments on complaints (e.g. screenshots)
- Email notifications on status change
- Password reset flow
- Pagination for large complaint lists
- Charts on the admin dashboard (e.g. Chart.js) for the stats already returned by the API
