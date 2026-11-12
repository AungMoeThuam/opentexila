# Frontend pages and routes

Proposed page catalogue — updated 29 October 2026. This documents the target structure for planning and assigning work. Most existing feature routes are placeholders, and the role-prefixed migration has not been implemented.

The initial scope is authentication, enrolments and attendance. The wider catalogue below lists possible pages, not a requirement to build every page for the assignment.

## Conventions

- Student pages use `/student`, lecturer pages use `/lecturer`, and administrator pages use `/admin`.
- The backend role remains `lecturer`; its frontend label is Lecturer and its URL prefix is `/lecturer`.
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

Class-session times and cancellation are authoritative. Account role is `student`/`lecturer`/`admin`; account status is `active`/`inactive`; class session state is `scheduled`/`cancelled`; attendance status is `pending`/`present`/`late`/`absent`. All four database columns are ENUMs. UI availability such as upcoming/in-progress/ended is derived; it is not another stored class state.

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
| `/lecturer/analytics`                                | `GET /lecturer/attendance-analytics` (proposed)                                                                           |

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

All routes require the stored `lecturer` role. Lecturers only access classes assigned to them.

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

| Route                                                    | Page and purpose                                                         | Priority                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `/admin/dashboard`                                       | Institution overview                                                     | Next; redirect initially |
| `/admin/users`                                           | Create accounts with temporary passwords, reset passwords, manage        | Core                     |
| `/admin/users/:userId`                                   | View account details                                                     | Next                     |
| `/admin/users/:userId/edit`                              | Edit supported account fields and status                                 | Next                     |
| `/admin/courses`                                         | List courses                                                             | Next                     |
| `/admin/courses/new`                                     | Create a course                                                          | Next                     |
| `/admin/courses/:courseId/edit`                          | Edit course code and name                                                | Next                     |
| `/admin/classes`                                         | List classes by course and term                                          | Next                     |
| `/admin/classes/new`                                     | Create a class with its course, term, section, lecturer and map location | Built                    |
| `/admin/classes/:classId`                                | View class details                                                       | Next                     |
| `/admin/classes/:classId/edit`                           | Edit class details and the map location and radius                       | Built                    |
| `/admin/classes/:classId/schedule`                       | List a class's sessions, filter by state, cancel a session               | Built                    |
| `/admin/classes/:classId/schedule/new`                   | Schedule a class session                                                 | Built                    |
| `/admin/class-sessions/:classSessionId`                  | View class session details, status and roster                            | Next                     |
| `/admin/class-sessions/:classSessionId/edit`             | Edit a session subject to backend timing restrictions                    | Next                     |
| `/admin/enrolments`                                      | Select a class to manage enrolments                                      | Core                     |
| `/admin/enrolments/:classId`                             | View roster, add students and remove enrolments                          | Core                     |
| `/admin/users/:userId/enrolments`                        | Inspect a student's class memberships                                    | Next                     |
| `/admin/attendance`                                      | Institution-wide attendance overview                                     | Next                     |
| `/admin/attendance/classes/:classId`                     | Class attendance summary and sessions                                    | Next                     |
| `/admin/attendance/classes/:classId/students/:studentId` | Student attendance within a class                                        | Next                     |
| `/admin/attendance/reports`                              | Filter and export attendance data                                        | Optional                 |
| `/admin/profile`                                         | Own profile and account settings                                         | Next                     |

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

Each role has its own home page (feature `src/features/dashboard/`). The pages are placeholders until their content issues land. `homeForRole()` returns these paths, and a signed-in user opening `/` is redirected to theirs:

| Role     | Home route       | Route name      |
| -------- | ---------------- | --------------- |
| Student  | `/student/home`  | `student-home`  |
| Lecturer | `/lecturer/home` | `lecturer-home` |
| Admin    | `/admin/home`    | `admin-home`    |

The admin home page (`AdminHomePage.vue`) greets the signed-in admin and links to Courses, Classes, Enrolments, Class attendance and Create account. The Courses and Classes cards show their totals, read from the existing `GET /courses` and `GET /classes` lists (one row per request, only `meta.total` is used). If the totals do not load, the page shows an error with **Try again**, and the shortcuts still work. With no courses and no classes it says nothing is set up yet.

## Class location editor

The class form (`/admin/classes/new` and `/admin/classes/:classId/edit`) sets where students can check in with a map, not only with typed numbers. A pin marks the classroom and a shaded circle shows the allowed radius. The admin can click the map, drag the pin, type the latitude and longitude, move the radius slider, or type the radius. All of them share the same three values (`latitude`, `longitude`, `radius_m`), so each change shows in all the others straight away. **Use my current location** places the pin at the admin's device location when the browser allows it. If the map tiles or the map library do not load, a message appears and the number inputs keep working. The same fields are saved with the existing class `POST` and `PATCH`.

Files: `GeofencePicker.vue` (map, inputs, slider), `GeofenceMap.vue` (the map), `use-geofence-map.js` (map setup, events, cleanup) and `services/geofence.js` (range checks, rounding to 6 decimals). Leaflet loads only when the form opens. Map tiles come from OpenStreetMap, and the attribution stays on the map. A circle cannot tell floors or rooms apart, and phone GPS is often 5 to 20 m off, so the form suggests a radius of about 50 m or more for a building.

### Suggestions on the class form

The term, section and room are still typed, but the form helps from the classes that already exist (no new endpoint; it reads `GET /classes`):

- **Term and room** list the values already in use. A value typed with different case, spaces or dashes takes the existing spelling ("2026 s2" becomes "2026-S2", "en 402" becomes "EN402"), so one term or room is never saved under two spellings. A new value is accepted as typed.
- **Section** shows the next free letter for the chosen course and term, with a button to use it, and warns early when the section is already taken. The server still rejects a duplicate.
- **Room and location:** when the room is one that another class uses, a new class with no location yet copies that class's latitude, longitude and radius, and says which class they came from. If a location is already set, the form offers **Use that location** and does not replace it unasked. If several classes use the room, the newest one is the source. The admin can always move the pin.

## Session attendance settings

`/admin/classes/:classId/attendance-settings` (route `admin-class-attendance-settings`, admin only) changes the attendance settings of **one session**, where the class form changes the **class defaults**. It is reached from **Attendance settings** on the class form and on each upcoming session of the class schedule (`?sessionId=` selects the session).

- **Class defaults** panel: the class's room and radius, with a link to the class form. New sessions copy these when they are scheduled, and changing them later does not change sessions that already exist.
- **This session only** form: pick one of the class's sessions that has not started, then change its room, its map location and radius (the same map editor as the class form), and its **late allowance** in whole minutes after the start. The page turns the allowance into an exact UTC late time. The allowance can be 0 up to the minute before the session ends.
- A sentence under the form says what students will experience ("Check-in opens at 09:00 and closes at 11:00. A check-in up to 09:15 is Present, and a later one is Late. Students must be within 75 m of the pin."). It changes as the values change. A note says when the session differs from the class defaults, with **Use the class defaults** to copy the class's room, location and radius.
- **Save for this session** sends only the changed fields with `PATCH /class-sessions/:classSessionId/attendance-policy` (backend `docs/api/attendance.md`). **Reset** returns to the saved values. A message shows under the wrong field, and the typed values stay when saving fails.
- **Try a check-in** (a calculator; on windows 1200 px wide or more it sits in a column beside the map, together with the sentence, and follows the page as you scroll, and on narrower windows it stacks under the map) answers what would happen if a student checked in at some place and time, using the values on the form, saved or not. A dark **test student** dot on the map can be dragged, or its distance from the pin typed, and a slider sets the check-in time from 30 minutes before the start to 30 minutes after the end. When the classroom pin moves (dragged, a click on the map, **Use my current location** or typed coordinates), the test student moves with it and keeps the same distance and direction from the pin. The answer is **Present**, **Late**, **Outside the area**, **Not open yet**, **Closed** or **Cancelled**, with the reason. It follows the server's rules: the start is inclusive, a check-in at the late time is still Present, the end is exclusive, a distance equal to the radius is inside, and a cancelled session accepts nobody. It never calls the server and never saves anything, and the server decides at a real check-in.
- The server only changes a session that has not started. If the session started, ended or was cancelled while the page was open, the page says so and reloads the list. Attendance records are never changed.

## Admin class attendance

The sidebar item **Class attendance** (`/attendance/classes`, route `class-attendance`) is a read-only view for admins. The admin chooses a class (kept in the address as `?classId=`, so a reload or Back returns to it) and sees its sessions: date and time window, late time, the time-based state, and the Present, Late, Absent and Pending counts. It uses `GET /classes/:classId/class-sessions` (backend #19). A session that has started has **View attendance**, which opens that session's read-only roster at `/attendance/class-sessions/:classSessionId` (route `admin-class-session-records`). The roster uses `GET /class-sessions/:classSessionId/records`, which already allows admins, and the same table, status filter and paging as the lecturer's roster. An ended session that still has pending students is marked as not finalised by the lecturer. Admins cannot change attendance here.

## Admin class sessions

From **Classes**, the **Schedule** button opens the sessions of one class (`admin-class-schedule`). The list shows each session's date and time window, the late time, the room and the attendance counts. The saved state (`scheduled` or `cancelled`) is shown apart from the time-based state (`upcoming`, `in progress`, `ended`). It can be filtered by state and is paged. **Cancel session** shows only for sessions that have not ended, and asks for confirmation first. The sessions API is in `backend/docs/api/attendance.md` (backend #19).

**Schedule a session** (`admin-class-session-new`) has Start time, Late after and End time. The admin types them in Kuala Lumpur time (UTC+8); the page sends UTC. Late after and End time follow the start time (15 minutes and 2 hours) until the admin changes them, and a sentence under the form explains what the times mean for students. Messages show under the fields for wrong times and a duplicate start. The typed times stay when saving fails.

**Clash warning.** While the admin types the times, the form loads that day's sessions from the timetable list (`GET /class-sessions?from&to`) and warns about any scheduled session that overlaps and shares the class, the lecturer or the room. Each warning gives the reason, the class, the lecturer, the time and room, and a link to that class's schedule. Moving to another time on the same days needs no new request. The warning is advice: **Schedule session** stays enabled and the server decides. If the server answers `409 SCHEDULE_CONFLICT`, its `error.conflicts` list is shown in the same format. If the day's sessions cannot be loaded, the form says the check could not run and still works.

## Announcements

Feature folder: `src/features/announcements/`. A lecturer posts news to a class, and students of that class read, like and comment. The sidebar item **Announcements** (all three roles) opens one feed of the posts from every class the user may see, so there are no per-class announcement pages. API contract: `backend/docs/api/announcements.md`.

The feed has search, a class filter, a category filter, sort (newest, oldest, most liked) and paging. Its filters live in the address, for example `/student/announcements?classId=1&category=exam&sort=oldest&page=2`, so a reload, a shared link or Back restores the same view. One page component serves the three feed routes, and one serves the three detail routes.

| Route                                          | Route name                   | Role     | Page                        | Status |
| ---------------------------------------------- | ---------------------------- | -------- | --------------------------- | ------ |
| `/student/announcements`                       | `student-announcements`      | Student  | Feed (all enrolled classes) | Built  |
| `/lecturer/announcements`                      | `lecturer-announcements`     | Lecturer | Feed (all taught classes)   | Built  |
| `/admin/announcements`                         | `admin-announcements`        | Admin    | Feed (all classes)          | Built  |
| `/lecturer/announcements/new`                  | `lecturer-announcement-new`  | Lecturer | Form: new announcement      | Built  |
| `/lecturer/announcements/:announcementId/edit` | `lecturer-announcement-edit` | Lecturer | Form: edit announcement     | Built  |
| `/student/announcements/:announcementId`       | `student-announcement`       | Student  | Detail, likes, comments     | Built  |
| `/lecturer/announcements/:announcementId`      | `lecturer-announcement`      | Lecturer | Detail, likes, comments     | Built  |
| `/admin/announcements/:announcementId`         | `admin-announcement`         | Admin    | Detail, likes, comments     | Built  |

The lecturer's "New announcement" button opens `/lecturer/announcements/new`, with `?classId=` when the feed is filtered to one class.

The detail page (`AnnouncementDetailPage.vue`) serves all three roles. It shows the class, category, author, date and the full text as plain text, with a back link to the feed. Students and lecturers like and unlike (the count changes at once and is undone if the request fails) and write comments (1 to 1000 characters). Comments are oldest first with **Load more**. Delete shows only where the server says `can_delete`, after a confirmation. An admin sees the like count without a button and without a comment form, and can delete any comment and the post. A lecturer sees **Edit** on own posts. Components: `LikeButton.vue`, `CommentList.vue`, `CommentForm.vue`.

The form (`AnnouncementFormPage.vue`) has two modes. **Create** has Class (the lecturer's own classes, from `GET /me/classes`), Category, Title and Body, and posts to `POST /classes/:classId/announcements`. `?classId=` chooses the class at the start; an unknown or foreign class is ignored. **Edit** shows the class as text, because a post cannot change class, and sends only the changed fields with `PATCH /announcements/:announcementId`. **Delete announcement** asks for confirmation and calls `DELETE /announcements/:announcementId`. After a save the lecturer goes to the feed (after a create, filtered to the post's class). A 404 shows "not found", a 403 shows the forbidden page, and the typed text stays when a save fails.

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
