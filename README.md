# OpenTexila frontend

Vue 3 frontend for OpenTexila, organised by feature and maintained separately from the NestJS backend.

**Status:** The app is built for all three roles (admin, lecturer and student) and runs against the live backend at https://opentexila.site. It has sign-in and forced password change, role home pages, courses, classes, class sessions, enrolments, attendance and check-in, analytics, announcements and an admin timetable. Only the generic `enrolments` route still shows a placeholder page. Assignments, resources, classrooms and users are not built.

## Stack

- Vue 3 and Composition API, using JavaScript.
- Vite for development and builds.
- Vue Router for navigation.
- Bootstrap 5 CSS and grid, plus custom CSS; no additional UI component library.
- Chart.js with vue-chartjs for attendance analytics, Leaflet for the geofence map editor and vuedraggable for the timetable. These are focused libraries, not UI kits.

Bootstrap JavaScript plugins are not loaded globally. Add individual plugins only when needed, with lifecycle cleanup; Vue manages the application's state.

## Setup

Requires Node.js 22.15.1 or newer and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`. The public home page works without the backend. For independent UI development, set `VITE_ENABLE_MOCK_AUTH=true` in `.env.local`, restart Vite, open `/login` and choose a demo role. Visit `/dev/example` for working UI behaviours. Mock mode blocks live API requests and is excluded from production. Do not overwrite an existing `.env`.

## Run against the live server (no Docker, no backend)

To try the app with real data without running the backend, use the hosted API at https://opentexila.site:

```sh
npm ci
npm run dev:live
```

Open `http://127.0.0.1:5173` in Chrome, Edge or Firefox (Safari does not accept the session cookies on plain `http`) and sign in with a demo account from [the demo accounts list](docs/PRODUCTION_DEMO_ACCOUNTS.md). Type the password yourself rather than relying on autofill. The settings come from `.env.live`, so there is nothing to create or edit. The live data is shared: a check-in made here is also recorded on the live site.

## Commands

Docker is also available: `docker compose up --build -d frontend` serves the production build at `http://localhost:8080`; `docker compose up --build frontend-dev` starts hot reload and mock auth at `http://localhost:5173`. See the [Docker guide](docs/DOCKER.md) for backend connections, ports and environment settings.

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the local Vite server.                               |
| `npm run dev:live`     | Start the local Vite server against the hosted API.        |
| `npm test`             | Test the API client, auth state, guards and mock fixtures. |
| `npm run build`        | Generate production files in `dist/`.                      |
| `npm run preview`      | Preview the production build locally after building.       |
| `npm run format`       | Format project files.                                      |
| `npm run format:check` | Check formatting.                                          |

## Project organisation

```text
src/
  main.js
  App.vue
  app-context.js         # Shared api client and auth store
  router/                # Root route assembly and access guard
  layouts/               # Public and signed-in shells; role-aware navigation
  features/
    auth/                # Sign-in, change password, admin account creation
    dashboard/           # Admin, lecturer and student home pages
    courses/             # Courses, classes, class sessions, geofence settings (admin)
    enrolments/          # Class lists, rosters and enrolment (admin, lecturer, student)
    attendance/          # Check-in, history, session records, analytics
    scheduling/          # Admin timetable
    announcements/       # Announcement feed, detail and form
    classrooms/          # Not built yet
    users/               # Not built yet
    resources/           # Not built yet
    assignments/         # Not built yet
  shared/
    pages/               # Welcome, errors, style guide and feature placeholder
    components/          # Icons, sidebar, confirm dialog, notifications, request state
    composables/
    services/            # Shared API client
    utils/
  dev/                   # Mock identity, role toolbar and example page (development only)
  assets/
    images/
    styles/
public/
docs/                    # Guides, design system, demo accounts and decision records (adr/)
tests/                   # Node test runner; see tests/README.md
```

Each feature folder holds its own pages, components, composables, services and `routes.js`. Feature-specific work belongs inside its feature. Cross-feature utilities belong in `shared/`. Some empty folders use `.gitkeep`. Feature route arrays are registered under the correct layout in `src/router/index.js`. Keep route names and `meta.roles` when you change a page.

## Backend configuration

The shared API client reads `VITE_API_BASE_URL` (default `/api/v1`), includes session cookies, handles CSRF for mutations and normalizes errors. Live mode checks `/auth/me` before protected routes or sign-in. Read the [foundation guide](docs/FRONTEND_FOUNDATION.md) for the exact backend contract and usage.

During development, Vite proxies `/api` to `API_PROXY_TARGET`, defaulting to `http://127.0.0.1:3000`. Start the backend separately for integration work, or use `npm run dev:live` to use the hosted API. API contracts are in the backend repository under `docs/api/`.

Only `VITE_*` settings are exposed to frontend code by default. Treat all frontend configuration as public and never include secrets. The Vite proxy applies only in development; production needs a reverse proxy or an explicit API URL with appropriate CORS, credential and cookie settings.

Vue Router uses HTML5 history. Production hosting must serve `index.html` for frontend routes and use the correct Vite base path when deployed in a subdirectory. If Mercury cannot provide history fallback, switch the router to hash history. HTTPS is required for deployed location check-in.

## Documentation

Start with the [shared frontend foundation guide](docs/FRONTEND_FOUNDATION.md) for team ownership, route integration, mock mode and API usage.

- [Pages and routes](docs/PAGES_AND_ROUTES.md): the page catalogue by role.
- [Student attendance](docs/STUDENT_ATTENDANCE.md): how student check-in and history work.
- [Hosted demo accounts](docs/PRODUCTION_DEMO_ACCOUNTS.md): accounts and data on https://opentexila.site.
- [Docker guide](docs/DOCKER.md): production image, hot reload and backend connections.
- [Frontend structure and conventions](docs/README.md) and [decision records](docs/adr/).

For shared styling, use the [OpenTexila design system](docs/DESIGN_SYSTEM.md). Run `npm run dev` and visit `/style-guide` for live examples using the same CSS as the app. Each member should reuse these patterns and keep feature CSS scoped.

API documentation is maintained in the backend repository under `docs/api/`; do not copy endpoint definitions here.

Tests use Node’s built-in test runner; no additional test dependency is needed. See [tests/README.md](tests/README.md). The production build is deployed at https://opentexila.site with the Docker setup above.
