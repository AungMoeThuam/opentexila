# Frontend documentation

- [Docker setup](DOCKER.md): production image, hot reload, backend proxy and configuration.

- [Frontend foundation](FRONTEND_FOUNDATION.md): start here for feature ownership, routes, identity, mock mode, API client and shared UI behaviour.
- [Design system](DESIGN_SYSTEM.md): tokens, Bootstrap classes, patterns and team styling rules.

Authentication owns identity and account pages; enrolments owns membership/rosters; attendance owns scheduled check-in/history. Each member implements their pages and related backend APIs. Root wiring assembles feature routes and services; shared presentation components stay independent of feature business logic.

Feature pages remain placeholders. Mock users and the example roster are explicitly development-only; they do not authenticate against the backend, enrol students or award attendance.

Backend endpoint definitions belong in the backend repository under `docs/api/`. The foundation guide records the frontend's required session/CSRF contract, which is also documented in backend `docs/api/auth.md`.

Run `npm test`, `npm run build` and `npm run format:check`, then verify affected pages in the browser, including keyboard and mobile behaviour.
