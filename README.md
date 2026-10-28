# OpenTexila frontend

Vue 3 frontend for OpenTexila, organised by feature and maintained separately from the NestJS backend.

**Status:** Shared frontend foundation ready: layouts, protected feature routes, role-aware navigation, session state, JSON API client, feedback components and development examples. Authentication, enrolment and attendance pages are placeholders for feature owners; backend authentication endpoints are still required for live sessions.

## Stack

- Vue 3 and Composition API, using JavaScript.
- Vite for development and builds.
- Vue Router for navigation.
- Bootstrap 5 CSS and grid, plus custom CSS; no additional UI component library.

Bootstrap JavaScript plugins are not loaded globally. Add individual plugins only when needed, with lifecycle cleanup; Vue manages the application's state.

## Setup

Requires Node.js 22.15.1 or newer and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:5173`. The public home page works without the backend. For independent UI development, set `VITE_ENABLE_MOCK_AUTH=true` in `.env.local`, restart Vite, open `/login` and choose a demo role. Visit `/dev/example` for working UI behaviours. Mock mode blocks live API requests and is excluded from production. Do not overwrite an existing `.env`.

## Commands

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the local Vite server.                               |
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
  router/                # Root route assembly
  layouts/               # Public and signed-in shells; role-aware navigation
  features/
    auth/                # Pages, components, composables, services, store, routes
    attendance/          # Pages, components, composables, services, routes
    enrolments/          # Class membership pages and routes
    dashboard/           # Deferred
    classrooms/          # Deferred
    users/               # Deferred
    announcements/       # Deferred
    resources/           # Deferred
    assignments/         # Deferred
  shared/
    pages/               # Welcome, errors and feature placeholder
    components/
    composables/
    services/
    utils/
  dev/                   # Mock identity, role toolbar and example page (development only)
  assets/
    images/
    styles/
public/
docs/
tests/
```

Feature-specific work belongs inside its feature. Cross-feature utilities belong in `shared/`. The empty folders use `.gitkeep`; add implementation files as needed. Feature route arrays are registered under the correct layout. Replace the shared placeholders with feature-owned pages; preserve their names and access metadata.

## Backend configuration

The shared API client reads `VITE_API_BASE_URL` (default `/api/v1`), includes session cookies, handles CSRF for mutations and normalizes errors. Live mode checks `/auth/me` before protected routes or sign-in. Read the [foundation guide](docs/FRONTEND_FOUNDATION.md) for the exact backend contract and usage.

During development, Vite proxies `/api` to `API_PROXY_TARGET`, defaulting to `http://127.0.0.1:3000`. Start the backend separately when implementing integration. The backend has database schemas and development-only sample classroom APIs; auth, enrolment and attendance endpoints still need implementation.

Only `VITE_*` settings are exposed to frontend code by default. Treat all frontend configuration as public and never include secrets. The Vite proxy applies only in development; production needs a reverse proxy or an explicit API URL with appropriate CORS, credential and cookie settings.

Vue Router uses HTML5 history. Production hosting must serve `index.html` for frontend routes and use the correct Vite base path when deployed in a subdirectory. If Mercury cannot provide history fallback, switch the router to hash history. HTTPS is required for deployed location check-in.

## Documentation

Start with the [shared frontend foundation guide](docs/FRONTEND_FOUNDATION.md) for team ownership, route integration, mock mode and API usage.

For shared styling, use the [OpenTexila design system](docs/DESIGN_SYSTEM.md). Run `npm run dev` and visit `/style-guide` for live examples using the same CSS as the app. Each member should reuse these patterns and keep feature CSS scoped.

See [frontend structure and conventions](docs/README.md). API documentation is maintained in the backend repository under `docs/api/`; add a repository URL when it is published rather than copying endpoint definitions here.

Tests use Node’s built-in test runner; no additional test dependency is needed. Deployment integration is not implemented.
