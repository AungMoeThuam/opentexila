# OpenTexila frontend

Vue 3 frontend for OpenTexila, organised by feature and maintained separately from the NestJS backend.

**Status:** Frontend foundation only. The welcome page and not-found navigation work. Auth and attendance folders are prepared, but login, API integration, route guards and attendance workflows are not implemented.

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

Open `http://127.0.0.1:5173`. The initial page works without the backend.

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the local Vite server.                         |
| `npm run build`        | Generate production files in `dist/`.                |
| `npm run preview`      | Preview the production build locally after building. |
| `npm run format`       | Format project files.                                |
| `npm run format:check` | Check formatting.                                    |

## Project organisation

```text
src/
  main.js
  App.vue
  router/                # Root route assembly
  layouts/               # Public layout and future signed-in shell
  features/
    auth/                # Pages, components, composables, services, store, routes
    attendance/          # Pages, components, composables, services, routes
    dashboard/           # Deferred
    classrooms/          # Deferred
    users/               # Deferred
    announcements/       # Deferred
    resources/           # Deferred
    assignments/         # Deferred
  shared/
    pages/               # Temporary welcome and not-found pages
    components/
    composables/
    services/
    utils/
  assets/
    images/
    styles/
public/
docs/
tests/
```

Feature-specific work belongs inside its feature. Cross-feature utilities belong in `shared/`. The empty folders use `.gitkeep`; add implementation files as needed. Auth and attendance route arrays are empty, and `AppLayout.vue` is not yet attached to protected routes.

## Backend configuration

The planned API client will read `VITE_API_BASE_URL`, defaulted in the environment example to `/api/v1`. No API requests are sent by the scaffold yet.

During development, Vite proxies `/api` to `API_PROXY_TARGET`, defaulting to `http://127.0.0.1:3000`. Start the backend separately when implementing integration. The current empty backend will return 404 for feature endpoints.

Only `VITE_*` settings are exposed to frontend code by default. Treat all frontend configuration as public and never include secrets. The Vite proxy applies only in development; production needs a reverse proxy or an explicit API URL with appropriate CORS, credential and cookie settings.

Vue Router uses HTML5 history. Production hosting must serve `index.html` for frontend routes and use the correct Vite base path when deployed in a subdirectory. If Mercury cannot provide history fallback, switch the router to hash history. HTTPS is required for deployed location check-in.

## Documentation

See [frontend structure and conventions](docs/README.md). API documentation is maintained in the backend repository under `docs/api/`; add a repository URL when it is published rather than copying endpoint definitions here.

No test runner, Git repository or deployment integration was initialised by this setup.
