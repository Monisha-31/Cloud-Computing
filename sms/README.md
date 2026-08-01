# Scholarship Management System

A full-stack scholarship management system with two roles: **Student** and **Admin**.

- **Student** — browses open scholarships, checks eligibility criteria, applies with academic score /
  family income / supporting documents, tracks application status.
- **Admin** — creates and manages scholarship listings (amount, eligibility thresholds, deadline),
  reviews applications, assigns a review score and notes, sets status (Pending / Under Review /
  Approved / Rejected), and sees a stats overview (total awarded, applications by status).

## Tech stack
- **Frontend:** plain HTML, CSS, JavaScript (no framework/build step)
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT, passwords hashed with bcrypt

## Project structure
```
sms/
  backend/
    config/db.js            MongoDB connection
    models/                 User.js, Scholarship.js, Application.js
    middleware/auth.js      JWT verification + role guard
    controllers/            request handlers (auth, scholarships, applications)
    routes/                 Express route definitions
    server.js                app entry point — also serves the frontend
    seedAdmin.js             creates the first admin account
    package.json
    .env.example
  frontend/
    index.html               login
    register.html             student sign-up
    student-dashboard.html    browse + apply + track applications
    admin-dashboard.html      manage scholarships + review applications + stats
    css/style.css
    js/api.js                 shared fetch/auth helper
```

## Setup

1. **Install MongoDB** locally, or use a free MongoDB Atlas cluster (cloud).

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
   This creates `admin@example.com` / `admin123`.

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open the app:** go to `http://localhost:5000`. The Express server serves the frontend directly —
   no separate frontend server needed.

## How the roles connect

- New sign-ups via `register.html` always become a `student`.
- The seeded admin creates scholarship listings from the **Scholarships** tab, setting eligibility
  thresholds (`minAcademicScore`, `maxFamilyIncome`) and a deadline.
- Students only see **active** scholarships whose deadline hasn't passed. When applying, they submit
  their academic score, family income, and a list of supporting documents (text description of each,
  e.g. "Income certificate - submitted" — file upload isn't implemented, see extensions below).
- The admin's review modal shows whether the applicant's numbers meet the scholarship's eligibility
  criteria (a simple client-side comparison) before the admin sets a review score, notes, and final status.

## API summary

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | Public (always creates a student) |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Logged in |
| GET | /api/scholarships | Logged in (students see active only) |
| POST | /api/scholarships | Admin |
| GET | /api/scholarships/:id | Logged in |
| PATCH | /api/scholarships/:id | Admin |
| DELETE | /api/scholarships/:id | Admin |
| POST | /api/applications | Student |
| GET | /api/applications | Logged in (scoped by role) |
| GET | /api/applications/:id | Owner / Admin |
| PATCH | /api/applications/:id/review | Admin |
| GET | /api/applications/stats/overview | Admin |

## Possible extensions for your report
- Real file uploads for supporting documents (e.g. via multer + cloud storage) instead of text descriptions
- Email notifications when an application's status changes
- Automatic eligibility filtering (hide scholarships a student doesn't qualify for, or warn before they apply)
- Password reset flow
- Export approved applications / award list as CSV or PDF
- Pagination for scholarships/applications lists at scale
