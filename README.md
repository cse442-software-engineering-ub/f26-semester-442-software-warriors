# VITALS

VITALS is a web app for keeping track of your health: blood pressure and pulse readings, medications, doctor appointments and a health journal. You can also link a caregiver (a family member, for example). The caregiver can then see your data and get emails when you share a reading.

It is the CSE 442 (Software Engineering, Fall 2026) project of team **442 Warriors** at the University at Buffalo.

| | Link |
|---|---|
| Test server (aptitude) | https://aptitude.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/ |
| Release server (cattle) | https://cattle.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/ |

> The UB servers are only reachable from the UB network. Off campus, connect to the UB VPN (Cisco AnyConnect) first.

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Frontend (`vitals-webapp/`)](#frontend-vitals-webapp)
5. [Backend (`api/`)](#backend-api)
6. [Database](#database)
7. [Running it locally](#running-it-locally)
8. [Deploying](#deploying)
9. [Team workflow](#team-workflow)
10. [Testing](#testing)
11. [Security rules](#security-rules)
12. [Team](#team)

---

## Features

| Page | Route | What it does |
|---|---|---|
| Landing | `/#/` | Intro page with Log in and Register |
| Register / Log in | `/#/register`, `/#/login` | Create an account and sign in. A session cookie (`VITALSSESSID`) keeps you logged in |
| Forgot password | `/#/forgot-password`, `/#/reset-code`, `/#/new-password` | A 6-digit code is emailed to you. It expires after 10 minutes and allows 5 guesses, and you can ask for at most 3 codes an hour. The reply is the same whether or not the email has an account |
| Dashboard | `/#/dashboard` | Latest reading with its American Heart Association category, today's medications and the next appointment. Add a reading from here |
| Health Journal | `/#/journal` | All readings with averages, plus a BP trend chart for 7, 30 or 90 days. Edit or delete readings, or share one with your caregiver by email |
| Medications | `/#/medications` | Add, edit and remove medications, and mark doses as taken |
| Appointments | `/#/appointments` | Upcoming and past appointments with notes. Includes a weekly calendar where days with appointments have a dot and you can click a day to see only that day |
| Caregivers | `/#/caregivers` | Invite a caregiver by email, see who is linked and remove them |
| Settings | `/#/settings` | Account details, notification frequency (daily or twice a day), and deleting the account |

**Caregiver view.** A caregiver who is linked to a patient sees the patient's data on every page. The caregiver can switch to **personal** view to see their own data instead. The backend works out whose data to use in `view_context.php`, so every page follows the same rule.

---

## Tech stack

| Part | Uses |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router 7 (`HashRouter`), Tailwind CSS 4 together with plain CSS files, and the React Compiler (Babel plugin) |
| Linting | oxlint (`npm run lint`) and `tsc` (run as part of `npm run build`) |
| Backend | PHP with PDO (prepared statements only) and PHP sessions. Each page has its own `.php` file, and there is no framework |
| Email | PHPMailer over SMTP (`api/PHPMailer/`) |
| Database | MySQL / MariaDB |
| Hosting | UB CSE servers aptitude (test) and cattle (release) |

---

## Repository layout

```
.
├── api/                      PHP backend (one file per endpoint)
│   ├── PHPMailer/            Mail library (vendored)
│   ├── db.php                Opens the PDO connection ($pdo) from db_config.php
│   ├── db_config.php         NOT in git: database login (see "Config files")
│   ├── mail_config.php       NOT in git: SMTP login (see "Config files")
│   ├── cors.php              Allowed origins + CSRF origin check
│   ├── session_setup.php     One session cookie for every endpoint
│   ├── require_auth.php      requireAuth(): 401 unless logged in
│   ├── view_context.php      getViewingContext(): whose data (patient or caregiver)
│   ├── input.php             textInput() + a safety net that turns any uncaught error into a JSON 500
│   ├── rate_limit.php        Limits wrong passwords, reset codes, invites and shared readings
│   ├── cron_setup.md         Crontab for the reminder emails
│   └── *.php                 Endpoints (see "Endpoints")
├── database/                 SQL to run in phpMyAdmin (rate_limits.sql)
├── vitals-webapp/            React frontend
│   ├── src/
│   │   ├── App.tsx           Routes
│   │   ├── api.ts            Every call to the backend lives here
│   │   ├── appointmentDates.ts  Date helpers for appointments and the calendar
│   │   ├── components/       Shared pieces (AppLayout, modals, BPTrendChart, WeekCalendar, …)
│   │   ├── pages/            One file per page (+ its CSS)
│   │   └── types/            Shared TypeScript types
│   ├── vite.config.ts        Dev proxy for /api, base "./"
│   └── package.json
└── README.md
```

---

## Frontend (`vitals-webapp/`)

### Scripts

Run these inside `vitals-webapp/`:

| Command | What it does |
|---|---|
| `npm install` | Install the dependencies. Run it once, and again whenever `package.json` changes |
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm run build` | Type-check with `tsc -b`, then build into `dist/` |
| `npm run lint` | Run oxlint. It should finish with no warnings |
| `npm run preview` | Serve the built `dist/` folder locally |

### How the frontend talks to the backend

- **All requests go through `src/api.ts`.** Pages call its functions, for example `getAppointmentsInRange(from, to)`, and never call `fetch` themselves. To add an endpoint, add its function to `api.ts`.
- `API_BASE` is `import.meta.env.VITE_API_URL`. When that is not set, it falls back to `/CSE442/2026-Fall/cse-442ab/api`, which is the address on the servers.
- Every request sends `credentials: "include"` so that the session cookie goes with it.
- When the backend answers **401**, the page sends you to `/login`.
- Routing uses `HashRouter`, so the addresses look like `…/cse-442ab/#/dashboard`. The servers don't need any rewrite rules for this to work.
- `vite.config.ts` sets `base: "./"`. This means the same build works on aptitude, on cattle and from a local folder.

### Adding a page

1. Create `src/pages/MyPage.tsx`, plus `MyPage.css` if the page needs its own styles.
2. Add a route in `src/App.tsx`: `<Route path="/my-page" element={<MyPage />} />`.
3. If the page needs the sidebar layout, wrap it in `AppLayout`, the same way the other logged-in pages do.
4. Add the backend calls the page needs to `src/api.ts`.

### Style notes

- Each page and component keeps its CSS in a file next to it, with class names that start with the page name (for example `appointments-calendar-day`). This stops styles from leaking into other pages.
- The shared colors are CSS variables, for example `var(--app-blue)`.
- The React Compiler and oxlint are strict about hooks. Don't call a `setState` directly inside a `useEffect`. Work the value out from existing state instead, or set it inside the `.then()` of a request.

---

## Backend (`api/`)

### What every endpoint does

Almost every endpoint starts the same way:

```php
require __DIR__ . '/cors.php';          // allowed origins, CSRF check, OPTIONS → 204
require __DIR__ . '/require_auth.php';  // session + requireAuth()
require __DIR__ . '/db.php';            // $pdo

$uid = requireAuth();                   // 401 {"error": "You must be logged in."} if not
$method = $_SERVER['REQUEST_METHOD'];
```

- **Responses are JSON.** Errors look like `{"error": "..."}` and come with a proper status code: 400 for invalid input, 401 when you are not logged in, 403 when you are not allowed, 404 when nothing was found, 405 for a wrong method, and 500 for a server error.
- **The SQL always uses prepared statements.** User input is never pasted into a query string.
- **You only see your own rows.** Every query filters by the uid of the person logged in, or by the linked patient's uid when the caregiver view is on. Another user's id returns 404, not their data.
- **Sessions.** `session_setup.php` names the cookie `VITALSSESSID` and makes it Secure, HttpOnly and SameSite=Lax. The cookie path is the app folder.
- **CORS / CSRF.** `cors.php` only trusts the server's own address, plus `localhost:5173` on aptitude for `npm run dev`. aptitude and cattle are shared by every CSE442 team, so neither server trusts the other. It refuses a POST, PUT or DELETE from any other origin with 403. Postman and curl send no Origin header, so API tests still work.
- **Caregiver view.** Use `getViewingContext($pdo, $uid)` from `view_context.php` to find whose data to read. It returns `['uid' => …, 'isPatientView' => …]`, based on the caregiver link and `$_SESSION['viewMode']`.

### Endpoints

| File | Methods | Purpose |
|---|---|---|
| `register.php` | POST | Create an account. It also finishes a caregiver invite when you sign up from an invite link |
| `login.php` | POST | Log in and start the session |
| `logout.php` | POST | End the session |
| `forgot_password.php` | POST | Email a 6-digit reset code |
| `verify_otp.php` | POST | Check the code (expires after 10 minutes, 5 guesses) |
| `reset_password.php` | POST | Set a new password after the code was verified |
| `account.php` | GET, POST, DELETE | Read and update account details, change the password, or delete the account with all its data |
| `homepage.php` | GET | Everything the dashboard needs in one call |
| `readings.php` | POST, PUT `?rid=`, DELETE `?rid=` | Add, edit and delete BP/pulse readings |
| `health_journal.php` | GET (`?days=7\|30\|90`) | Readings, averages and data for the trend chart |
| `send_reading.php` | POST | Email one reading to the linked caregiver |
| `medications.php` | GET, POST, PUT, DELETE | Medications |
| `medication_taken.php` | POST | Mark a dose as taken |
| `appointments.php` | GET, POST, PUT, DELETE | Appointments, including their notes. A plain GET returns `appointments` (upcoming) and `past_appointments`. `GET ?from=YYYY-MM-DD&to=YYYY-MM-DD` returns every appointment in that range, up to 42 days, for the calendar (#132). `PUT ?aid=N` with only `notes` saves the note |
| `caregivers.php` | GET, POST, PUT, DELETE | List, invite and remove caregivers |
| `caregiver_invite.php` | GET | The link in the invite email. Accepts the invite and sends you to the frontend |
| `view_mode.php` | POST `{"viewMode":"personal"\|"caregiver"}` | Switch a caregiver between their own data and the patient's |
| `notifications.php` | GET, POST | Notification frequency settings |
| `send_notifications.php` | cron only | Sends the reminder emails (see `api/cron_setup.md`). It refuses to run when opened in a browser |
| `landing.php` | GET | Data for the landing page |
| `update_permissions.php` | — | Placeholder, not implemented yet |

### Config files (never commit these)

`api/db_config.php` and `api/mail_config.php` are listed in `.gitignore` because they hold passwords. Each developer and each server keeps its own copy. Make them from these templates, and only ever put real values in your local copy or on the server:

```php
<?php
// api/db_config.php
return [
    'host'   => 'localhost',
    'dbname' => 'YOUR_DATABASE',
    'user'   => 'YOUR_DB_USER',
    'pass'   => 'YOUR_DB_PASSWORD',
];
```

```php
<?php
// api/mail_config.php
return [
    'host'     => 'smtp.gmail.com',
    'username' => 'YOUR_SENDER_EMAIL',
    'password' => 'YOUR_APP_PASSWORD',
];
```

---

## Database

The team database on the UB server is `cse442_2026_fall_team_ab_db`. You manage it through phpMyAdmin on aptitude.

| Table | Holds |
|---|---|
| `users` | Accounts, with passwords hashed by `password_hash` |
| `readings` | Systolic, diastolic, pulse and time, per user |
| `medications` | Name, dose, schedule and whether it is "as needed", per user |
| `medication_doses` | Each dose that was taken |
| `appointments` | Doctor, date and time (`appointment_date`), location, address and notes, per user |
| `caregivers` | Patient ↔ caregiver links |
| `caregiver_invitations` | Pending invites sent by email |
| `notification_preferences` | How often each user gets reminders |
| `rate_limits` | Recent logins, reset codes, invites and shared readings, used for the limits. Created by `database/rate_limits.sql`; rows older than a day are removed automatically |

To change the schema, write the SQL in the task card first so the whole team can run the same change. Then apply it on aptitude, and on cattle only when you release.

---

## Running it locally

### Option A: frontend only, using the aptitude backend (the usual setup)

This is the quickest way to work on the UI. Vite forwards `/api` to aptitude, so you use the real test backend and the real test database.

```bash
cd vitals-webapp
npm install
echo "VITE_API_URL=/api" > .env.development   # gitignored, so make it once
npm run dev                                   # http://localhost:5173
```

- You need the UB VPN or the campus network.
- The proxy rewrites the cookie path, so logging in works on `localhost:5173`.
- Use the **team test accounts**. Don't use real personal accounts.

### Option B: the whole stack on your machine

Use this when you change PHP or SQL and want to try it before anything goes on aptitude.

1. Install PHP 8 (with `pdo_mysql`) and MySQL or MariaDB.
2. Create a local database and create the tables from the [Database](#database) section. You can export the structure without any data from phpMyAdmin.
3. Write `api/db_config.php` with your local login.
4. Build the frontend so that it calls `/api`:
   ```bash
   cd vitals-webapp
   VITE_API_URL=/api npm run build
   ```
5. Put `dist/` and `api/` side by side in one folder and serve that folder:
   ```bash
   mkdir -p ~/vitals-local && cp -r vitals-webapp/dist/* ~/vitals-local/ && ln -s "$PWD/api" ~/vitals-local/api
   php -S localhost:8000 -t ~/vitals-local
   ```
6. Open http://localhost:8000/.

> The session cookie is marked `Secure`. Browsers still accept it on `http://localhost`, but they won't on a plain-http LAN address.

---

## Deploying

Only code that has been **merged into `dev`** goes on the servers. Never deploy straight from a feature branch.

The app lives in `/data/web/CSE442/2026-Fall/cse-442ab/` on both servers, and the layout is:

```
cse-442ab/
├── index.html, assets/ …     ← contents of vitals-webapp/dist/
└── api/                      ← contents of api/ (+ the server's own db_config.php / mail_config.php)
```

1. `git checkout dev && git pull`
2. `cd vitals-webapp && npm install && npm run build`
3. Upload the contents of `dist/` to `cse-442ab/` and `api/` to `cse-442ab/api/`. The team uses the VS Code SFTP extension for this; `.vscode/sftp.json` is gitignored.
4. **Don't overwrite or delete** the server's `db_config.php` or `mail_config.php`.
5. **Aptitude** is for testing the acceptance tests. **Cattle** is the release server: deploy to it at the end of a sprint, after the tests pass on aptitude.
6. Uploaded files need permissions that let the web server read them, for example 644 for files and 755 for folders. Never use `chmod 777` or give write access to others.
7. The reminder emails need the cron entry in `api/cron_setup.md` on the server.
8. When a branch adds a `.sql` file in `database/`, run it once in phpMyAdmin (SQL tab), first on aptitude and then on cattle at release.
9. The PM grades from **aptitude**, so make sure everything for the sprint is deployed there by the deadline.

---

## Team workflow

### PM Tool (our in-house tracker)

The team's work is tracked in **PM Tool**, the course's in-house project tracker, and not on GitHub Issues or GitHub Projects. Pick *Fall 2026* and *CSE 442 – Software Engineering Concepts* at the top, then open the **442 Warriors** team.

**Dashboard.** The team view shows:
- the team vision
- the latest status report and the PM's comments
- **My Cards** (the cards assigned to you)
- the sprint grades and when the current sprint ends
- the meeting times
- links to GitHub, the roadmap, the wireframes and the production site
- the team policies

The **Status Reports** and **Sprint Grading** pages are in the left menu.

**Scrum board.** Every card moves through every column. Don't skip a column, because the PM grades by where cards are:

| Column | Means |
|---|---|
| Backlog | Written, but not picked for a sprint yet |
| Planned | Picked for this sprint and assigned |
| In Progress | Someone is working on it (branch open) |
| Testing | Merged into `dev` and on aptitude. The card's tests are being run |
| Complete | All its tests passed on aptitude |
| Closed | Done and graded (past sprints) |

Each card shows its type (**User Story** or **Task**), its sprint (for example **Sprint 4**), its number (for example **#133**), who it is assigned to, and a link to its GitHub branch or PR. You can search the board by keyword or card number, and use **Filters** to show only some cards.

**Card numbers are PM Tool numbers.** They are *not* GitHub issue or PR numbers: card #132 and PR #93 are different things. Use the card number in branch names and PR titles. Don't write `Closes #132` in a PR, because GitHub would read it as its own issue #132.

**Grading rule (from the team policies):** the PM checks **aptitude only**. A card's work has to be deployed on aptitude by the deadline. Merged into `dev` but not on aptitude counts as **unprepared**.

**Meetings:**
- **Team meeting:** Friday 14:00, Baldy 19
- **Checkpoint:** Monday 08:30, Discord voice channel
- There is a 3-minute buffer. After that you are marked late, and later still, absent.

### Cards

- **User story** card, written as: *As a [specific user], I want [goal], which is confirmed by [what proves it works].* It includes acceptance tests with a **Happy path** and an **Alternate path**, written as "Ensure …" steps.
- **Task cards** hang off a story, usually one for the **backend** and one for the **frontend**. Each one has numbered tests written as "Verify …" steps.
- Tests are written so that someone else can follow them: "Test N – Title", numbered steps, real aptitude links, the test account to use and the exact inputs to type. Every test lists all of its steps, so it never says "do the same as Test 2".

### Branches

- `main` holds the release. `dev` is where finished work gets merged.
- Make one branch per task card, named after the card number and title. **Put the name in quotes**, because `#` starts a comment in the shell:
  ```bash
  git checkout dev && git pull
  git checkout -b '#132_Calendar-appointment-days-backend'
  ```
- Keep a branch to its own card. Backend and frontend go on separate branches and in separate PRs.

### Commits

Write a short title, then a description that says what changed and why:

```bash
git add api/appointments.php
git commit -m "Add from/to date range to appointments.php" -m "GET ?from=&to= returns every appointment in the range (max 42 days) for the calendar. Bad dates return 400 before any SQL runs."
git push -u origin '#132_Calendar-appointment-days-backend'
```

### Pull requests

1. Push your branch, then **check it out** (`git checkout '<branch>'`). VS Code's *Create Pull Request* only lets you click Create when you are on the branch you want to merge.
2. Open the PR from **your branch** into **`dev`**. Never push to `dev` directly.
3. Put the PM Tool card number in the title (for example `#132 Calendar appointment days backend`) and paste or link the card's tests in the description. Don't use `Closes #…`, because card numbers aren't GitHub issues.
4. Before you ask for a review, make sure `npm run build` and `npm run lint` pass and the PR has no merge conflicts with `dev`.
5. At least one teammate reviews and approves it before it's merged into `dev`.
6. Deploy `dev` to aptitude and move the card to **Testing** in PM Tool. Once its tests pass on aptitude, move it to **Complete**.
7. If `dev` changed under your branch, update your branch before merging (`git merge dev`, or rebase) and run the tests again.

### Communication

The team talks on Discord, and the Monday checkpoint is held in its voice channel. Post short updates there: what you merged, what's on aptitude, and what is blocked. Every meeting and every bug you fix goes in the debug log.

---

## Testing

| Kind | How |
|---|---|
| Backend | **Postman** against aptitude using the test accounts. Each backend card lists the exact requests and the replies to expect, including error cases like bad input, a missing login and another user's id |
| Frontend | Follow the card's numbered browser tests on aptitude. Check desktop and phone width |
| Types and lint | `npm run build` (includes `tsc`) and `npm run lint` must both be clean |
| Acceptance | When a story's cards are merged and deployed, the story's Happy and Alternate path tests are run on aptitude |

Clean up any test data afterwards, using the app or phpMyAdmin. Only touch rows that belong to the test accounts.

---

## Security rules

The repo is **public**. These rules are not optional:

- **Never commit** `api/db_config.php`, `api/mail_config.php`, `.env` files or `.vscode/sftp.json`. Run `git status` before every commit.
- Never put your UBIT password, your person number, database or mail passwords, or app passwords in code, Postman collections, screenshots, Discord or GitHub.
- Use the team test accounts for testing. Don't use real people's data.
- Phone numbers are exactly 10 digits everywhere (backend and frontend).
- Read text fields with `textInput()` from `api/input.php`, so a list or an object gets a 400 and not a crash.
- Use prepared statements for all SQL. Check every input on the backend, even when the frontend already checks it.
- Don't use `chmod 777` and don't make server files writable by others.
- Only try security tests (injection, other users' ids, and so on) on your **own local copy**, never on the shared servers.

---

## Team

| Member | GitHub |
|---|---|
| Merveilles | [MrKat-Merv](https://github.com/MrKat-Merv) |
| Ryan | [Awetlz](https://github.com/Awetlz) |
| Christian | [cdfox05](https://github.com/cdfox05) |
| Emma | [emmaress](https://github.com/emmaress) |
| Raven | [RavenB409](https://github.com/RavenB409) |
| Dharmi | Project Manager |

CSE 442 – Software Engineering, University at Buffalo, Fall 2026.
