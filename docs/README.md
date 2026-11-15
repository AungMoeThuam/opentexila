# Frontend documentation

- [Pages and routes](PAGES_AND_ROUTES.md): every route by role, the backend endpoints each page uses, and the larger features (map editor, session attendance settings, class attendance, class sessions, announcements).
- [Frontend foundation](FRONTEND_FOUNDATION.md): start here for feature ownership, routes, identity, mock mode, API client and shared UI behaviour.
- [Design system](DESIGN_SYSTEM.md): tokens, Bootstrap classes, patterns and team styling rules.
- [Student attendance](STUDENT_ATTENDANCE.md): how scheduled classes, check-in and history work for students.
- [Docker setup](DOCKER.md): production image, hot reload, backend proxy and configuration.
- [Hosted demo accounts](PRODUCTION_DEMO_ACCOUNTS.md): the accounts and data on https://opentexila.site, and how to try the live check-in.
- [Decision records](adr/): short records of design decisions, such as the choice of Chart.js.

The app is built for all three roles. Authentication owns identity and account pages; enrolments owns membership and rosters; attendance owns check-in, history and analytics. Courses, classes, the admin timetable, announcements and the role home pages have their own feature folders. Root wiring assembles feature routes and services; shared presentation components stay independent of feature business logic.

Mock users and the example roster are development-only. They do not authenticate against the backend, enrol students or award attendance. Use `npm run dev:live` to try the app with real data against the hosted server (see the [README](../README.md)).

Backend endpoint definitions belong in the backend repository under `docs/api/`. The foundation guide records the frontend's required session and CSRF contract, which is also documented in backend `docs/api/auth.md`.

Run `npm test`, `npm run build` and `npm run format:check`, then verify affected pages in the browser, including keyboard and mobile behaviour.
