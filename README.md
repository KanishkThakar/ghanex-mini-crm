# Mini CRM

A small, responsive CRM for managing leads and customer enquiries. Capture a lead, track it from **New → Contacted → Qualified → Converted**, search and filter the list, and see the pipeline at a glance on the dashboard.

**Live demo:** https://ghanex-mini-crm-kt.onrender.com (free tier: the first load can take ~50 s while the instance wakes up)

---

## Features

| Requirement | How it is covered |
|---|---|
| Lead management | Create, view, edit and delete leads (modal form, confirm-before-delete) |
| Lead details | Name, email, phone, company, enquiry source, plus notes and deal value |
| Lead status | New, Contacted, Qualified, Converted, changeable inline from the table |
| Search & filtering | Debounced search across name, email, company and phone; filter by status; sort; pagination |
| Dashboard | Total leads, count per status (cards double as filters), pipeline value and conversion rate |
| Backend & database | REST API (Express) with SQLite persistence, input validation with Zod |
| User experience | Responsive layout (table collapses to cards on mobile), skeleton loading, empty states, error state with retry, toasts, inline form errors |

## Tech stack

- **Frontend:** React 18 + TypeScript, built with Vite. Plain CSS, no UI framework.
- **Backend:** Node.js 20 + Express 4.
- **Database:** SQLite via `better-sqlite3`.
- **Validation:** Zod (one schema drives create and partial update).
- **Tests:** Node's built-in test runner (`node:test`) against an in-memory database.
- **Hosting:** Render (one web service serves both the API and the built frontend).

## Getting started

Requirements: Node.js 20+ and npm.

```bash
git clone <this repo>
cd mini-crm
npm install          # backend dependencies
npm run build        # installs and builds the React client into client/dist
npm start            # API + built UI on http://localhost:4000
```

### Development (hot reload)

```bash
npm install
npm --prefix client install
npm run dev          # API on :4000, Vite on http://localhost:5173 (proxies /api)
```

### Tests

```bash
npm test
```

Covers create/list/get/update/delete, validation errors, search and status filtering, 404s and the stats endpoint.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `DATABASE_FILE` | `data/crm.db` | SQLite file path (`:memory:` for an ephemeral DB) |
| `SEED` | `true` | Seeds 12 demo leads when the table is empty; set `false` to start blank |

## API

Base path `/api`. All responses are JSON. Errors look like `{ "error": { "message": "...", "details": { "field": "reason" } } }`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/leads` | List leads. Query: `search`, `status`, `sort` (`updated_at`, `created_at`, `name`, `value`), `order` (`asc`/`desc`), `limit`, `offset`. Returns `{ data, total, limit, offset }` |
| GET | `/api/leads/:id` | One lead |
| POST | `/api/leads` | Create a lead (`name`, `email`, `source` required) |
| PATCH | `/api/leads/:id` | Update any subset of fields |
| DELETE | `/api/leads/:id` | Delete a lead (204) |
| GET | `/api/stats` | Totals, counts and value by status, counts by source, pipeline value, conversion rate |

## Project structure

```
mini-crm/
├── server/
│   ├── src/
│   │   ├── index.js     # entry point: open DB, seed, listen
│   │   ├── app.js       # Express app: middleware, routes, static client, error handler
│   │   ├── leads.js     # lead routes, Zod schemas, queries, stats
│   │   ├── db.js        # SQLite connection and schema migration
│   │   └── seed.js      # demo data
│   └── test/leads.test.js
├── client/
│   └── src/
│       ├── App.tsx      # page state: filters, paging, modals, toasts
│       ├── api.ts       # typed fetch wrapper + ApiError
│       ├── types.ts     # shared Lead / Stats types
│       └── components/  # StatsBar, LeadTable, LeadForm, ConfirmDialog, Modal, Toasts
└── render.yaml          # Render blueprint
```

## Design and architecture decisions

- **One deployable service.** Express serves the REST API under `/api` and the built React app for everything else. No CORS setup, one URL, one free-tier service. In development Vite proxies `/api`, so the client always calls same-origin paths.
- **SQLite over Postgres/Mongo.** The data is a single relational table with filters, sorting and aggregates, which SQL does well. SQLite needs no separate server, so anyone can clone and run it in one command. The query layer is plain SQL with parameters, so moving to PostgreSQL later means swapping the driver, not rewriting the logic.
- **Validation at the edge with Zod.** Every write is parsed before it touches the database. The update schema is the create schema made partial, so rules live in one place. Field-level messages flow back to the form and show next to the right input. The table also has a `CHECK` constraint on status as a second guard.
- **Server-side search, filter, sort and pagination.** The list endpoint does the work in SQL (`LIKE` across name/email/company/phone, indexed status filter, whitelisted sort columns), so the UI stays fast as data grows and sorting can't be used for SQL injection.
- **Dashboard from one endpoint.** `/api/stats` computes counts and values with `GROUP BY`, so the cards are always consistent with the data. The status cards are also the status filter.
- **UI states are explicit.** Skeleton rows while loading, distinct empty states for "no data" vs "no matches", a full error state with retry, inline validation, and an optimistic status change that rolls back if the request fails.
- **Small, typed frontend.** React hooks without a state library: the app has one screen and the state fits in `App.tsx`. TypeScript types mirror the API so mismatches fail at build time.

## Main challenge and how I solved it

Keeping the list, the filters and the dashboard in sync. A lead's status can change from the table dropdown, from the edit form or by deleting it, and each change affects the current page, the total count and every dashboard card. Patching each piece of state by hand quickly went out of sync (for example, moving a lead out of the filtered status left it on screen and the counts stale).

I made the server the single source of truth: after any write the client reloads the current page and `/api/stats` together. For the inline status dropdown, where waiting would feel slow, the change is applied optimistically and rolled back with an error toast if the API rejects it. Deleting the last lead on a page steps back a page instead of showing an empty one. Search is debounced (300 ms) and resets to page one so results never point past the end.

A second, smaller one was deployment on a free host with a file database: the DB directory is created on start and the schema migration is idempotent, and demo data is seeded only when the table is empty, so a fresh instance is always usable for review.
