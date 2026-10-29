# Shared frontend foundation

For the proposed `/student`, `/lecturer` and `/admin` page structure, see [Pages and routes](PAGES_AND_ROUTES.md). Paths in this foundation guide describe the existing scaffold; the role-prefix migration has not been implemented.

Start here before implementing authentication, enrolments or attendance pages. The theme stays red/navy, Bootstrap 5 and JavaScript. This foundation supplies integration patterns; feature pages and backend business rules still need implementation.

The backend names its entities `Course`, `Class`, `Enrolment`, `ClassSession` and `AttendanceRecord`. Existing scaffold parameters `classId` and `meetingId` / `sessionId` refer to `classes.id` (`classId`) and `class_sessions.id` (`classSessionId`). They do not refer to login sessions. New routes in the page catalogue use `classId` and `classSessionId`, with matching kebab-case resource paths (`classes` and `class-sessions`). No router changes are included in this documentation update.

## Run without the backend

1. Install dependencies with `npm ci`.
2. In your local `.env.local`, set `VITE_ENABLE_MOCK_AUTH=true`. Do not overwrite existing settings or commit local environment files.
3. Run `npm run dev` and open `/login`.
4. Use the yellow development toolbar to select Student, Lecturer or Admin.
5. Open **Example page** (`/dev/example`) and **Style guide** (`/style-guide`).

Mock mode is explicit, development-only and blocked from using the shared live API client. It never sends a fake identity to the backend. Only the selected fixture role is saved in sessionStorage for that browser tab; passwords and tokens are not saved. The example roster uses fictional browser-memory records and resets on reload. Actual feature routes show honest placeholders until their owners implement them.

To integrate with the backend, set the flag to `false` and restart Vite. A backend outage or missing `/auth/me` endpoint shows a session-service error with retry, not a fake authenticated user. Production builds ignore the mock flag and exclude the role toolbar, mock-session adapter, example page and style-guide routes. Mock IDs are not seed IDs and must never be used in live requests.

## Ownership and routes

| Owner / feature               | Route file                          | Initial page slots                                                                                                                |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Aung Moe Thu / authentication | `src/features/auth/routes.js`       | `/login`, `/change-password`, `/admin/users`                                                                                      |
| Kar You Chia / enrolments     | `src/features/enrolments/routes.js` | `/my-classes`, `/enrolments`, `/enrolments/:classId`                                                                              |
| Show Wai Yan / attendance     | `src/features/attendance/routes.js` | `/attendance`, `/attendance/meetings/:meetingId`, `/attendance/history`, `/attendance/classes`, `/attendance/sessions/:sessionId` |

These follow the proposed team division; coordinate if assignments change. Each member owns their pages and related backend APIs. Aung coordinates shared changes. Student self-enrolment remains undecided; there is no Browse/Enrol action in this foundation. Lecturer access to enrolment pages is for reading rosters; API permissions must restrict writes to authorized users.

Replace a route's `component: page` with a lazy import of your own page, for example `component: () => import('./pages/MyClassesPage.vue')`, and remove placeholder `props`. Keep its route name and `meta.roles`. These route paths are **UI paths**, not endpoint definitions.

The router assembles feature arrays beneath PublicLayout or AppLayout. AppLayout already supplies the sidebar, top bar and `.ot-page` wrapper. Do not duplicate them. Access metadata on the parent supplies `requiresAuth`; roles on each child restrict page access. The same role rules drive navigation. Backend APIs must still check active account status, roles, membership and ownership independently.

Authentication state is checked before protected navigation. A 401 from the shared API clears identity and returns an already-open protected page to sign-in. A 403 is a page/action permission error and does not log the user out. Server/network failures are not treated as logout. The sign-in feature should use `safeRedirect` for its return URL and the route guard will check the destination's role.

## Shared identity

```js
import { auth } from '../../../app-context'; // Adjust relative depth for your file.
import { homeForRole, safeRedirect } from '../../../router/access';

// auth.state is reactive and readonly. Read inside computed/template, not a copied snapshot.
const user = computed(() => auth.state.user);
await auth.login({ email, password });
await router.replace(
  safeRedirect(route.query.redirect, homeForRole(auth.state.user.role)),
);
// AppLayout already provides sign-out using auth.logout().
```

Import `computed` from Vue and use Vue Router's `useRoute`/`useRouter` in your page. `auth.state.status` is `unknown`, `loading`, `authenticated`, `guest` or `error`. `auth.restore()` deduplicates session requests; `restore({ force: true })` retries. Only `id`, `name`, `email`, `role`, `status` are retained. The backend role is `teacher`; show “Lecturer” in the UI.

## Shared API client

```js
import { api } from '../../../app-context';

// Use the agreed endpoint; this path illustrates the client, not an implemented API.
const result = await api.request('/your-feature?page=1');
// Keep result.data and result.meta together for paginated lists.
await api.request('/your-feature', { method: 'POST', body: {/* fields */} });
```

The client prefixes `VITE_API_BASE_URL`, includes cookies, serializes JSON and automatically gets a CSRF token before POST/PATCH/PUT/DELETE. Do not attach browser session IDs or user roles in request headers. All mutations, including login, use CSRF. Concurrent mutations share token initialization. Login/logout reset the cached token; `CSRF_INVALID` clears it for the next explicit retry. Mutations are never automatically replayed.

Use `try/catch` in the feature to display `error.message` and validation `error.fields`. Errors also have `status` and `code`. Both the planned `{ error: { code, message, fields } }` envelope and Nest's default `{ statusCode, message, error }` are understood. Network errors use `NETWORK_ERROR`; invalid success bodies use `INVALID_RESPONSE`. Do not show raw error objects or send multiple notifications for the same failure. A `204` response returns `null`.

Pass an AbortController's `signal` to `api.request` and abort on unmount or superseded searches. `AbortError` is cancellation, not a user-facing failure. This client handles JSON, not uploads/downloads; add that support centrally when required.

The frontend expects this **backend integration contract** (not yet implemented):

| Endpoint            | Expected response                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /auth/csrf`    | `{ "data": { "csrfToken": "opaque-token" } }`; initialize cookie session if needed                                                                                 |
| `GET /auth/me`      | `{ "data": { "id": 1, "name": "Demo", "email": "demo@example.test", "role": "student", "status": "active", "must_change_password": false } }`; 401 when signed out |
| `POST /auth/login`  | Same safe profile envelope; rotate server session cookie                                                                                                           |
| `POST /auth/logout` | `204 No Content`; destroy server session                                                                                                                           |

Paths are relative to `/api/v1`. CSRF request header: `X-CSRF-Token`. Invalid CSRF: 403 with `error.code: "CSRF_INVALID"`. For field errors, use a field-name-to-message map. This contract is recorded in backend `docs/api/auth.md`; change it with the auth owner in both repositories. Prefer same-origin hosting via the Vite development proxy and a production reverse proxy. Cross-origin hosting requires coordinated CORS, credentials and cookie settings.

## Reusable UI behaviour

| Component / helper      | Usage                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `RequestState.vue`      | `state="loading\|empty\|error\|success"`, `title`, `message`; `retry` and `@retry` for recoverable errors |
| `ConfirmDialog.vue`     | Controlled `open`, `title`, `message`, `confirmLabel`, `busy`, `error`; emits `confirm`/`cancel`          |
| `notify(message, type)` | Global notification (`success`, `error`, `warning`); user-dismissed, maximum five visible                 |
| `AppIcon.vue`           | One shared icon set                                                                                       |

ConfirmDialog uses native `<dialog>`: focus starts on Cancel, stays within the modal and returns on close. The parent owns the async operation and keeps the dialog open with an error on failure; `busy` disables repeated actions and cancellation while work is pending. If the trigger is removed, the parent should focus a stable control after closing. The mobile sidebar also uses a native modal dialog; Escape/backdrop closes it and restores focus. It blocks background interaction and page scrolling while open.

Use `/dev/example` to exercise list loading, empty, retryable error, inline validation, simulated save failure, confirmation, pending buttons and notifications. Copy the pattern, not its mock data or delays, into feature pages. The existing `/style-guide` remains the source for visual tokens and classes.

## Checks before a PR

- Run `npm test`, `npm run build` and `npm run format:check`.
- Check your page at 390px, 768px and 1280px; test keyboard navigation and zoom.
- Verify loading, empty, failure, success and forbidden states.
- Check role-specific links and direct URL access. Hiding a link alone is not authorization.
- Keep feature CSS scoped; shared CSS/components/navigation changes need one coordinated review.
- Update this guide and style-guide examples if you change a shared pattern.

The Node tests cover HTTP/CSRF behaviour, error normalization, session state, guard decisions and mock fixtures without a backend. Feature APIs and end-to-end authentication still require integration tests once implemented.
