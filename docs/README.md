# Frontend documentation

## Feature boundaries

- `features/auth/`: future account activation, login/logout, invitations and shared identity state.
- `features/attendance/`: future scheduled attendance, location check-in and attendance history.
- `shared/`: generic UI and logic used across features. Shared code should not depend on individual features.
- `router/`: assembles feature route arrays; access guards will be added with authentication.
- `layouts/`: public and signed-in application shells.

The current scaffold implements only the public shell, welcome page and not-found page. It does not simulate successful authentication or attendance.

## UI conventions

Start with the [shared design system and team styling agreement](DESIGN_SYSTEM.md). Run the frontend and open `/style-guide` to see the actual theme, controls and responsive patterns. The route is development-only.

Use Bootstrap grid classes for mobile-first page layouts and shared custom CSS for OpenTexila branding. Build reusable Vue components as needed. Use JavaScript `<script setup>` without TypeScript. Keep labels, keyboard focus and loading/error/empty states part of each feature's implementation.

Keep feature state near its pages and composables. Auth will own shared identity/session state. Do not store passwords, session cookies or student coordinates in local storage.

## API documentation

The backend repository owns endpoint definitions in `docs/api/README.md`, `docs/api/auth.md` and `docs/api/attendance.md`. Link to the published backend repository when its URL is available. This repository documents only frontend usage and UI behaviour.

## Verification

Run the production build and formatting check for scaffold changes. Check the rendered welcome/not-found pages and responsive layout when changing the shell. Add meaningful feature and integration tests when authentication and attendance are implemented; the `tests/` folder is currently a placeholder.
