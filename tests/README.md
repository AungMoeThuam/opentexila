# Frontend tests

Run `npm test` for all `tests/*.test.js` files. Tests use Node's built-in runner; helpers live under `tests/helpers/` and are not test entry points.

## Organization

- `api-client`, `auth-state`, `session-adapter`, `router-access`: shared request, identity and access behaviour.
- `class-list-service`: one table-driven contract suite for the student and lecturer class-list adapters. Their query tests remain separate because defaults and blank-input handling differ.
- `*-composable`: loading, filtering, pagination, retries and outdated-request handling for each feature.
- `mock-*` and `class-sessions-mock`: development fixture contracts and consistency.
- Other feature tests: query validation, response handling, date formatting and status presentation.

## Adding tests

Test observable behaviour and meaningful boundary cases. Use named subtests for repeated contract cases, share small fixtures, and avoid copying production algorithms into mocks. Keep role-specific scenarios even when the API endpoint is shared.

A higher test count after splitting into named subtests does not mean more duplicate test code. Do not remove permission, cancellation or request-race coverage just to reduce the count.

These tests do not render Vue pages or replace browser verification. After UI changes, also check navigation, forms, keyboard use and mobile layouts in the browser. Run `npm run build` and `npm run format:check` before a pull request.
