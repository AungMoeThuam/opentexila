# Frontend pages and routes

Page catalogue as built, checked against the route files in `src/features/*/routes.js` on 15 November 2026. It lists every route, who may open it and which backend endpoints it uses. The detailed sections after the tables describe the larger features (map editor, session attendance settings, class attendance, class sessions and announcements).

The three roles are `student`, `lecturer` and `admin`. Router guards control navigation only; the backend independently enforces roles, assigned-class access and student membership. Routes are registered in `src/router/index.js` under `PublicLayout` (guests) or `AppLayout` (signed in).

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

## Database-to-route mapping

| Browser parameter | Database identifier |
| ----------------- | ------------------- |
| `classId`         | `classes.id`        |
| `classSessionId`  | `class_sessions.id` |

Backend foreign keys are `class_id` and `class_session_id`. `enrolments` uses composite primary key `(class_id, student_id)` and `attendance_records` uses composite primary key `(class_session_id, student_id)`. Frontend code should map agreed API response fields explicitly. Authentication session identifiers (`auth_sessions`) are unrelated and must not be used as resource IDs. The database identifiers do not appear in route names; routes use `classId` and `classSessionId`.

Class-session times and cancellation are authoritative. Account role is `student`/`lecturer`/`admin`; account status is `active`/`inactive`; class session state is `scheduled`/`cancelled`; attendance status is `pending`/`present`/`late`/`absent`. All four database columns are ENUMs. UI availability such as upcoming/in-progress/ended is derived; it is not another stored class state.

## Backend endpoints used

All paths are relative to `/api/v1`. Backend documentation in `backend/docs/api/` owns payloads, errors and permissions; this table maps the frontend pages to the endpoints they call. `/me` always means the authenticated user, never a client-supplied user ID.

| Workflow / frontend page                                                     | Backend endpoints                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Sign-in, sign-out, session check, password change                            | `GET /auth/csrf`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`                   |
| `/admin/invitations` (create account and user list)                          | `POST /admin/users`, `GET /admin/users`, `POST /admin/users/:userId/reset-password`                                       |
| `/student/classes`, `/my-classes`, `/lecturer/classes`                       | `GET /me/classes`                                                                                                         |
| `/admin/enrolments`                                                          | `GET /classes`                                                                                                            |
| `/admin/enrolments/:classId`                                                 | `GET /classes/:classId/enrolments`, `POST /classes/:classId/enrolments`, `DELETE /classes/:classId/enrolments/:studentId` |
| `/lecturer/classes/:classId/students`                                        | `GET /classes/:classId/enrolments` (read-only, assigned classes)                                                          |
| `/student/attendance`, `/lecturer/attendance`                                | `GET /me/class-sessions`                                                                                                  |
| `/student/attendance/class-sessions/:classSessionId`                         | `GET /class-sessions/:classSessionId`, `POST /class-sessions/:classSessionId/check-ins`                                   |
| `/student/attendance/history`, `/attendance/history`                         | `GET /me/attendance-records`, `GET /me/attendance-records/classes`                                                        |
| `/lecturer/class-sessions/:classSessionId`, `/attendance/class-sessions/:id` | `GET /class-sessions/:classSessionId/records`                                                                             |
| `/lecturer/analytics`                                                        | `GET /lecturer/attendance-analytics`                                                                                      |
| `/attendance/classes` (admin class attendance)                               | `GET /classes`, `GET /classes/:classId/class-sessions`                                                                    |
| `/admin/courses`, `/admin/courses/new`, `/admin/courses/:courseId/edit`      | `GET /courses`, `POST /courses`, `PATCH /courses/:courseId`                                                               |
| `/admin/classes`, `/admin/classes/new`, `/admin/classes/:classId/edit`       | `GET /classes`, `POST /classes`, `GET /classes/:classId`, `PATCH /classes/:classId`, `GET /lecturers`                     |
| `/admin/classes/:classId/schedule`, `.../schedule/new`                       | `GET /classes/:classId/class-sessions`, `POST /classes/:classId/class-sessions`, `POST /class-sessions/:id/cancel`        |
| `/admin/classes/:classId/attendance-settings`                                | `PATCH /class-sessions/:classSessionId/attendance-policy`                                                                 |
| `/admin/timetable`                                                           | `GET /class-sessions`, `PATCH /class-sessions/batch`                                                                      |
| Announcement feeds, forms and details (all roles)                            | See [Announcements](#announcements)                                                                                       |

Collection filters belong in query parameters. The development sample `GET /examples/classrooms` is not used by any page.

## Public and shared pages

| Route                  | Route name            | Page or behaviour                                                             | Access                  |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------- | ----------------------- |
| `/`                    | `home`                | Landing page for guests; signed-in users are redirected to their role home    | Everyone                |
| `/login`               | `login`               | Sign in                                                                       | Guests only             |
| `/activate`            | `activate`            | Change the temporary or current password (`must_change_password` flow)        | Signed-in users         |
| `/forbidden`           | `forbidden`           | Explain denied access (a wrong-role page shows this; a 403 does not sign out) | Signed-in users         |
| `/session-unavailable` | `session-unavailable` | Explain session verification failure and allow retry                          | Everyone                |
| `/:pathMatch(.*)*`     | `not-found`           | Not found page                                                                | Everyone                |
| `/style-guide`         | `style-guide`         | Shared styling and component reference                                        | Development builds only |
| `/dev/example`         | `example`             | Shared UI and API-client usage examples                                       | Development builds only |

There is no public registration. Administrators create accounts with a temporary password (`must_change_password = true`), and the route guard sends a user with that flag to `/activate` until the password is changed.

## Student pages

All routes require the student role. The sidebar shows Home, My classes, Announcements, and an Attendance group with Scheduled classes and My history.

| Route                                                              | Route name                                         | Page and purpose                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------- |
| `/student/home`                                                    | `student-home`                                     | Today's classes (sessions that start today) with a check-in shortcut |
| `/student/classes`, `/my-classes`                                  | `student-classes`, `my-classes`                    | Enrolled classes (both paths open the same page)                     |
| `/student/attendance`                                              | `student-attendance`                               | Scheduled classes: sessions with status and the student's attendance |
| `/student/attendance/class-sessions/:classSessionId`               | `student-class-session-check-in`                   | Location-based check-in and result                                   |
| `/student/attendance/history`, `/attendance/history`               | `student-attendance-history`, `attendance-history` | Own attendance records with filters (both paths open the same page)  |
| `/student/announcements`, `/student/announcements/:announcementId` | `student-announcements`, `student-announcement`    | Announcement feed and detail with likes and comments                 |

The check-in page uses `classSessionId`. Check-in is available from the scheduled start until the class ends. The student allows location access and submits the check-in; the server validates enrolment, time, location accuracy and distance, and decides Present or Late. Raw coordinates are not stored. See [Student attendance](STUDENT_ATTENDANCE.md).

## Lecturer pages

All routes require the lecturer role. Lecturers only reach classes assigned to them. The sidebar shows Home, My classes, Announcements, Attendance and Analytics.

| Route                                                             | Route name                           | Page and purpose                                                 |
| ----------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `/lecturer/home`                                                  | `lecturer-home`                      | Today's and upcoming sessions and quick-access cards             |
| `/lecturer/classes`                                               | `lecturer-classes`                   | Assigned classes                                                 |
| `/lecturer/classes/:classId/students`                             | `lecturer-class-students`            | Read-only roster of one class                                    |
| `/lecturer/attendance`                                            | `lecturer-attendance`                | Class sessions with filters; open an attendance roster           |
| `/lecturer/class-sessions/:classSessionId`                        | `lecturer-class-session-records`     | Attendance roster for one session, with status filter and paging |
| `/lecturer/analytics`                                             | `lecturer-analytics`                 | Attendance analytics with charts and table alternatives          |
| `/lecturer/announcements` and its `new`, `:id`, `:id/edit` routes | `lecturer-announcements` and related | Feed, create, edit, detail and comment moderation                |

## Administrator pages

All routes require the admin role. The sidebar shows Home, Courses, Classes, Timetable, Enrolments, Announcements, Class attendance and Create account.

| Route                                                  | Route name                                  | Page and purpose                                                                      |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `/admin/home`                                          | `admin-home`                                | Institution overview, today's sessions and counts                                     |
| `/admin/invitations`                                   | `invitations`                               | Create account (sidebar: Create account) and the searchable user list                 |
| `/admin/courses`                                       | `admin-courses`                             | List, search and sort courses                                                         |
| `/admin/courses/new`, `/admin/courses/:courseId/edit`  | `admin-course-new`, `admin-course-edit`     | Create and edit a course                                                              |
| `/admin/classes`                                       | `admin-classes`                             | List classes by course and term                                                       |
| `/admin/classes/new`, `/admin/classes/:classId/edit`   | `admin-class-new`, `admin-class-edit`       | Create and edit a class, with map location and radius                                 |
| `/admin/classes/:classId/schedule`                     | `admin-class-schedule`                      | List a class's sessions, filter by state, cancel a session                            |
| `/admin/classes/:classId/schedule/new`                 | `admin-class-session-new`                   | Schedule a class session, with clash warnings                                         |
| `/admin/classes/:classId/attendance-settings`          | `admin-class-attendance-settings`           | Change one session's room, location, radius and late allowance                        |
| `/admin/timetable`                                     | `admin-timetable`                           | Weekly timetable with drag-and-drop rescheduling and conflict checks                  |
| `/admin/enrolments`                                    | `admin-enrolments`                          | Choose a class to manage enrolments                                                   |
| `/admin/enrolments/:classId`                           | `admin-class-enrolments`                    | View the roster, add students and remove enrolments                                   |
| `/attendance/classes`                                  | `class-attendance`                          | Read-only attendance by class (see [Admin class attendance](#admin-class-attendance)) |
| `/attendance/class-sessions/:classSessionId`           | `admin-class-session-records`               | Read-only attendance roster for one session                                           |
| `/admin/announcements` and its `:announcementId` route | `admin-announcements`, `admin-announcement` | All announcements; detail with comment and post deletion                              |

Admins create accounts and manage enrolments. A lecturer's roster is read-only, and neither role can change attendance by hand.

## Not built

These pages were planned but do not exist. Do not link to them.

- Detail pages for classes, courses, users and sessions (`/student/classes/:classId`, `/lecturer/classes/:classId`, `/admin/classes/:classId`, `/admin/users/:userId`).
- Profile pages (`/student/profile`, `/lecturer/profile`, `/admin/profile`).
- Per-role timetables for students and lecturers, and an institution-wide attendance overview or reports with export.
- Student self-enrolment (`/student/available-classes`, `/student/enrolment-requests`). Enrolment stays administrator-managed.
- The `assignments`, `classrooms`, `resources` and `users` feature folders are empty.

## Actions and states that do not need separate pages

Use dialogs, tabs or inline states for:

- Creating a user account with a temporary password or resetting a password.
- Adding students to a class or removing an enrolment.
- Cancelling a class session or deactivating an account.
- Changing a password within profile settings, when supported.
- Check-in results: permission denied, location unavailable or inaccurate, outside the allowed area, accepted, not started, ended or cancelled.
- Loading, empty results, validation errors, API failures and success messages.

Manual attendance awards, session-code entry and lecturer-controlled opening are not part of the automatic check-in flow.

Use query parameters for filters rather than creating more pages, for example:

```text
/student/attendance/history?classId=1&status=late
/lecturer/attendance/classes/1?from=2026-10-01&to=2026-10-31
/admin/classes?courseId=1&term=2026-S2
```

## Role home pages

Each role has its own home page in `src/features/dashboard/`. `homeForRole()` returns these paths, and a signed-in user opening `/` is redirected to theirs:

| Role     | Home route       | Route name      |
| -------- | ---------------- | --------------- |
| Student  | `/student/home`  | `student-home`  |
| Lecturer | `/lecturer/home` | `lecturer-home` |
| Admin    | `/admin/home`    | `admin-home`    |

The student home lists today's classes: the sessions that **start** today, in the browser's local time. A session that started on an earlier day and is still open does not appear there; **Attendance → Scheduled classes** lists it. Each card shows the session's availability, not the student's own attendance result.

The admin home page (`AdminHomePage.vue`) greets the signed-in admin, shows today's sessions and links to Courses, Classes, Enrolments, Class attendance and Create account. The Courses and Classes cards show their totals, read from the existing `GET /courses` and `GET /classes` lists (one row per request, only `meta.total` is used). If the totals do not load, the page shows an error with **Try again**, and the shortcuts still work. With no courses and no classes it says nothing is set up yet.

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

## Legacy routes and redirects

Some older paths still exist:

| Route                                 | Behaviour                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/attendance`                         | Redirects to `/student/attendance`                                                                                                    |
| `/attendance/meetings/:meetingId`     | Redirects to `/student/attendance/class-sessions/:classSessionId`                                                                     |
| `/my-classes`, `/attendance/history`  | Still in use by the student sidebar; they open the same pages as the `/student/...` paths                                             |
| `/activate`, `/admin/invitations`     | Current paths for the password change page and the admin Create account page                                                          |
| `/enrolments`, `/enrolments/:classId` | Placeholder pages (`FeaturePlaceholder`) for admin and lecturer; the real pages are under `/admin/enrolments` and `/lecturer/classes` |

When changing a route, update its definition, unique route name, `homeForRole()`, sidebar links, redirects and the affected tests together. If old URLs are kept as redirects, resolve them by role and apply the access checks again.

## Implementation notes

- Reuse roster and attendance components where behaviour is shared. Keep business logic within its feature rather than duplicating it by role.
- Timetables are derived from `class_sessions`, joined with class, course and lecturer data. There is no separate recurring timetable table.
- The shared authentication and API-client foundation defines the session and CSRF pattern. Development mock users do not provide real authentication or attendance.

See [Frontend foundation](FRONTEND_FOUNDATION.md) for integration patterns, [Design system](DESIGN_SYSTEM.md) for shared styling, [Docker setup](DOCKER.md) for local running and [Hosted demo accounts](PRODUCTION_DEMO_ACCOUNTS.md) for the live site.
