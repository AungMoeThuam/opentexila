# Frontend pages and routes

Proposed page catalogue — updated 29 October 2026. This documents the target structure for planning and assigning work. Most existing feature routes are placeholders, and the role-prefixed migration has not been implemented.

The initial scope is authentication, enrolments and attendance. The wider catalogue below lists possible pages, not a requirement to build every page for the assignment.

## Conventions

- Student pages use `/student`, lecturer pages use `/lecturer`, and administrator pages use `/admin`.
- The backend role remains `teacher`; its frontend label is Lecturer and its URL prefix is `/lecturer`.
- Use lowercase, plural, kebab-case resource paths: `classes`, `class-sessions` and `enrolments`.
- Browser routes keep role prefixes. Backend resource APIs use `/api/v1` without role prefixes; the server authorises and scopes each request.
- Use camelCase path/query parameter names (`classId`); database columns and JSON foreign-key fields use snake_case (`class_id`).
- Vue route names should be unique and role-prefixed, e.g. `student-classes`, `student-class-session-check-in` and `lecturer-class-session-records`.
- `courseId` identifies a course; `classId` identifies a `classes` record representing a course offering (term and section), not a physical room.
- `classSessionId` identifies a `class_sessions` row (one scheduled occurrence). Use these explicit parameter names in new routes; database foreign-key fields remain snake_case. `userId` and `studentId` identify user records.
- Router guards control navigation. APIs must independently enforce roles, assigned-class access and student membership.
- Keep source code organised by feature. Different role routes can reuse components with appropriate permissions.

**Core** means first milestone. **Next** means a later expansion. **Optional** means a candidate requiring a scope decision. Existing shared and development pages are identified separately.

## Database-to-route mapping

| Browser parameter | Database identifier |
| ----------------- | ------------------- |
| `classId`         | `classes.id`        |
| `classSessionId`  | `class_sessions.id` |

Backend foreign keys are `class_id` and `class_session_id`. `enrolments` uses composite primary key `(class_id, student_id)` and `attendance_records` uses composite primary key `(class_session_id, student_id)`. Frontend code should map agreed API response fields explicitly. Authentication session identifiers (`auth_sessions`) are unrelated and must not be used as resource IDs. Route paths in this catalogue remain proposals; the database refactor does not change Vue routes.

Class-session times and cancellation are authoritative. Account role is `student`/`teacher`/`admin`; account status is `active`/`inactive`; class session state is `scheduled`/`cancelled`; attendance status is `pending`/`present`/`late`/`absent`. All four database columns are ENUMs. UI availability such as upcoming/in-progress/ended is derived; it is not another stored class state.

## Backend route conventions and first-milestone mapping

The following backend endpoints are **proposed, not implemented**. Paths are relative to `/api/v1`. Backend documentation owns payloads, errors and permissions; this table maps the frontend workflows for issue planning.

| Workflow / frontend page                             | Backend endpoints                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/student/classes`                                   | `GET /me/classes`                                                                                                         |
| `/admin/enrolments`                                  | `GET /classes`                                                                                                            |
| `/admin/enrolments/:classId`                         | `GET /classes/:classId/enrolments`, `POST /classes/:classId/enrolments`, `DELETE /classes/:classId/enrolments/:studentId` |
| `/lecturer/classes/:classId/students`                | `GET /classes/:classId/enrolments` (read-only, assigned classes)                                                          |
| `/student/attendance`                                | `GET /me/class-sessions`                                                                                                  |
| `/student/attendance/class-sessions/:classSessionId` | `GET /class-sessions/:classSessionId`, `POST /class-sessions/:classSessionId/check-ins`                                   |
| `/student/attendance/history`                        | `GET /me/attendance-records`                                                                                              |
| `/lecturer/attendance`                               | `GET /me/class-sessions` (assigned classes)                                                                               |
| `/lecturer/class-sessions/:classSessionId`           | `GET /class-sessions/:classSessionId/records`                                                                             |

`GET /me/classes` can serve enrolled students and assigned lecturers using the authenticated user's role. `/me` always means the authenticated user, never a client-supplied user ID. Enrolment mutations are administrator-only in the initial scope. `DELETE /classes/:classId/enrolments/:studentId` removes an enrolment; existing attendance records remain because they reference `users.id` directly. Exact request bodies remain to be agreed before implementation.

Later scheduling routes use `GET`/`POST /classes/:classId/class-sessions` and `PATCH /class-sessions/:classSessionId`. Collection filters belong in query parameters. Authentication uses `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/csrf` and `/auth/change-password`.

The implemented development sample remains `/examples/classrooms` for compatibility. It is not the proposed production `/classes` endpoint. Changing these documents does not rename the sample API or Vue scaffold routes.

## Public and shared pages

| Route                  | Page or behaviour                                                       | Access                             | Priority             |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------- | -------------------- |
| `/`                    | Redirect guests to login and signed-in users to their role landing page | Everyone                           | Core                 |
| `/login`               | Sign in                                                                 | Guests                             | Core                 |
| `/change-password`     | Change temporary or current password (`must_change_password` flow)      | Signed-in users                    | Core                 |
| `/forbidden`           | Explain denied access                                                   | Signed-in users                    | Existing shared page |
| `/session-unavailable` | Explain session verification failure and allow retry                    | Everyone                           | Existing shared page |
| `/:pathMatch(.*)*`     | Not found fallback                                                      | Everyone                           | Existing shared page |
| `/style-guide`         | Shared styling and component reference                                  | Development only                   | Existing             |
| `/dev/example`         | Shared UI and API-client usage examples                                 | Signed-in development/mock session | Existing             |

There is no public student or lecturer registration page in the initial plan. Administrators create accounts with a temporary password (`must_change_password = true`), and users change their password on first login.

## Student pages

All routes require the student role. Class information and attendance must be scoped to the signed-in student's permitted records.

| Route                                                | Page and purpose                           | Priority                 |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------ |
| `/student/dashboard`                                 | Overview of today's classes and attendance | Next; redirect initially |
| `/student/classes`                                   | List enrolled classes                      | Core                     |
| `/student/classes/:classId`                          | Class details, course, lecturer and term   | Next                     |
| `/student/classes/:classId/schedule`                 | Scheduled sessions for one class           | Next                     |
| `/student/timetable`                                 | Combined timetable across enrolled classes | Next                     |
| `/student/attendance`                                | Today's classes and check-in availability  | Core                     |
| `/student/attendance/class-sessions/:classSessionId` | Location-based check-in and result         | Core                     |
| `/student/attendance/history`                        | Own attendance records and filters         | Core                     |
| `/student/profile`                                   | Own profile and account settings           | Next                     |

The check-in page uses `classSessionId`. Check-in becomes available at the scheduled start and remains available until the class ends. Students allow location access and submit check-in; the backend validates eligibility, time and location. No lecturer opening action or session code is part of this flow.

## Lecturer pages

All routes require the stored `teacher` role. Lecturers only access classes assigned to them.

| Route                                                       | Page and purpose                                              | Priority                 |
| ----------------------------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| `/lecturer/dashboard`                                       | Overview of assigned classes and attendance                   | Next; redirect initially |
| `/lecturer/classes`                                         | List assigned classes                                         | Next                     |
| `/lecturer/classes/:classId`                                | Assigned class details                                        | Next                     |
| `/lecturer/classes/:classId/students`                       | Read the class's enrolled-student roster                      | Core                     |
| `/lecturer/classes/:classId/schedule`                       | View class sessions                                           | Next                     |
| `/lecturer/timetable`                                       | Combined timetable of assigned classes                        | Next                     |
| `/lecturer/attendance`                                      | Select assigned classes and sessions; open attendance rosters | Core                     |
| `/lecturer/attendance/classes/:classId`                     | Class attendance summary and session list                     | Next                     |
| `/lecturer/class-sessions/:classSessionId`                  | Attendance roster for one class session                       | Core                     |
| `/lecturer/attendance/classes/:classId/students/:studentId` | One student's attendance within that class                    | Next                     |
| `/lecturer/attendance/reports`                              | Filter and export permitted attendance data                   | Optional                 |
| `/lecturer/profile`                                         | Own profile and account settings                              | Next                     |

The core attendance overview links directly to class session rosters by `classSessionId`.

## Administrator pages

All routes require the admin role. Initial enrolment management assigns existing students to existing classes; seeded courses, classes and class sessions can support the first milestone.

| Route                                                    | Page and purpose                                                  | Priority                 |
| -------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------ |
| `/admin/dashboard`                                       | Institution overview                                              | Next; redirect initially |
| `/admin/users`                                           | Create accounts with temporary passwords, reset passwords, manage | Core                     |
| `/admin/users/:userId`                                   | View account details                                              | Next                     |
| `/admin/users/:userId/edit`                              | Edit supported account fields and status                          | Next                     |
| `/admin/courses`                                         | List courses                                                      | Next                     |
| `/admin/courses/new`                                     | Create a course                                                   | Next                     |
| `/admin/courses/:courseId/edit`                          | Edit course code and name                                         | Next                     |
| `/admin/classes`                                         | List classes by course and term                                   | Next                     |
| `/admin/classes/new`                                     | Create a class with its course, term, section and lecturer        | Next                     |
| `/admin/classes/:classId`                                | View class details                                                | Next                     |
| `/admin/classes/:classId/edit`                           | Edit class details and supported location settings                | Next                     |
| `/admin/classes/:classId/schedule`                       | Manage a class's scheduled sessions                               | Next                     |
| `/admin/classes/:classId/class-sessions/new`             | Schedule a class session                                          | Next                     |
| `/admin/class-sessions/:classSessionId`                  | View class session details, status and roster                     | Next                     |
| `/admin/class-sessions/:classSessionId/edit`             | Edit a session subject to backend timing restrictions             | Next                     |
| `/admin/enrolments`                                      | Select a class to manage enrolments                               | Core                     |
| `/admin/enrolments/:classId`                             | View roster, add students and remove enrolments                   | Core                     |
| `/admin/users/:userId/enrolments`                        | Inspect a student's class memberships                             | Next                     |
| `/admin/attendance`                                      | Institution-wide attendance overview                              | Next                     |
| `/admin/attendance/classes/:classId`                     | Class attendance summary and sessions                             | Next                     |
| `/admin/attendance/classes/:classId/students/:studentId` | Student attendance within a class                                 | Next                     |
| `/admin/attendance/reports`                              | Filter and export attendance data                                 | Optional                 |
| `/admin/profile`                                         | Own profile and account settings                                  | Next                     |

Administrator attendance pages can reuse lecturer attendance components with administrator access rules. Session details and class-scoped student attendance are supporting destinations, not additional first-milestone requirements.

## Actions and states that do not need separate pages

Use dialogs, tabs or inline states for:

- Creating a user account with a temporary password or resetting a password.
- Adding students to a class or removing an enrolment.
- Cancelling a class session or deactivating an account.
- Changing a password within profile settings, when supported.
- Check-in results: permission denied, location unavailable or inaccurate, outside the allowed area, accepted, not started, ended or cancelled.
- Loading, empty results, validation errors, API failures and success messages.

Manual attendance awards, session-code entry and lecturer-controlled opening are outside the planned automatic check-in flow.

Use query parameters for filters rather than creating more pages, for example:

```text
/student/attendance/history?classId=1&status=late
/lecturer/attendance/classes/1?from=2026-10-01&to=2026-10-31
/admin/classes?courseId=1&term=2026-S2
```

## Optional student self-enrolment

Self-enrolment policy is not settled. The initial scope uses administrator-managed enrolments. Only add these routes if the team agrees on eligibility, capacity and whether approval is needed:

| Route                         | Possible purpose                                      |
| ----------------------------- | ----------------------------------------------------- |
| `/student/available-classes`  | Browse eligible classes and join or request enrolment |
| `/student/enrolment-requests` | Track requests if an approval workflow is introduced  |

An approval workflow needs additional backend and database design. The team must also decide whether a student may join multiple sections of the same course in one term.

## Proposed first-milestone ownership

Each member builds their frontend pages and related backend APIs. This is a planning proposal; effort should be balanced by workflow complexity rather than page count.

| Member       | Feature                        | Core routes and coordination                                                                                                                                                   |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aung Moe Thu | Authentication and integration | `/login`, `/change-password`, `/admin/users`; coordinate access guards, role redirects and shared navigation                                                                   |
| Kar You Chia | Enrolments                     | `/student/classes`, `/admin/enrolments`, `/admin/enrolments/:classId`, `/lecturer/classes/:classId/students`                                                                   |
| Show Wai Yan | Attendance                     | `/student/attendance`, `/student/attendance/class-sessions/:classSessionId`, `/student/attendance/history`, `/lecturer/attendance`, `/lecturer/class-sessions/:classSessionId` |

Use seeded courses, classes, users and class sessions initially. Shared error pages already exist. Agree API request/response contracts and mock data before parallel implementation so page development can proceed independently.

Until dedicated dashboards are built, proposed role landing redirects are:

| Entry routes                       | Temporary destination  |
| ---------------------------------- | ---------------------- |
| `/student`, `/student/dashboard`   | `/student/classes`     |
| `/lecturer`, `/lecturer/dashboard` | `/lecturer/attendance` |
| `/admin`, `/admin/dashboard`       | `/admin/enrolments`    |

## Existing scaffold versus planned routes

The following table is a migration plan, not a claim that these changes are implemented.

| Existing route                                       | Proposed destination or change                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/`                                                  | Replace welcome page with guest/role landing redirect                             |
| `/login`                                             | Keep path; replace feature placeholder                                            |
| `/activate`, `/admin/invitations`                    | Replace with `/change-password` and `/admin/users`                                |
| `/my-classes`                                        | `/student/classes`                                                                |
| `/enrolments`                                        | `/admin/enrolments`; lecturer class browsing later uses `/lecturer/classes`       |
| `/enrolments/:classId`                               | Split into `/admin/enrolments/:classId` and `/lecturer/classes/:classId/students` |
| `/attendance`                                        | `/student/attendance`                                                             |
| `/attendance/meetings/:meetingId`                    | `/student/attendance/class-sessions/:classSessionId`                              |
| `/attendance/history`                                | `/student/attendance/history`                                                     |
| `/attendance/classes`                                | `/lecturer/attendance` and later `/admin/attendance`                              |
| `/attendance/sessions/:sessionId`                    | `/lecturer/class-sessions/:classSessionId` and later the administrator equivalent |
| Shared error pages, catch-all and development routes | Keep existing paths                                                               |

When implementing the migration, update feature route definitions, unique route names, role-home resolution, sidebar links, mock role switching, redirects and affected tests together. If old URLs are retained as redirects, resolve them according to role and reapply access checks.

## Implementation dependencies

- Reuse roster, profile, schedule and attendance components where behaviour is shared. Keep business logic within its feature rather than duplicating it by role.
- Timetables are derived from `class_sessions`, joined with class, course and lecturer data; student timetables are filtered through enrolments. There is no separate recurring timetable table. A recurring-session generator is additional scope.
- Existing database schemas do not mean every listed API exists. Build and verify the endpoints required for each selected workflow.
- The shared authentication and API-client foundation defines the session/CSRF integration pattern. Development mock users do not provide real authentication or attendance.
- Reports, password reset, enrolment approval and recurring scheduling remain optional work requiring explicit planning.

See [Frontend foundation](FRONTEND_FOUNDATION.md) for current integration patterns, [Design system](DESIGN_SYSTEM.md) for shared styling, and [Docker setup](DOCKER.md) for local running instructions.
