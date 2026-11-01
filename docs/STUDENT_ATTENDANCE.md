# Student attendance

Implemented routes:

- `/student/attendance` (`student-attendance`): paginated scheduled sessions.
- `/student/attendance/class-sessions/:classSessionId` (`student-class-session-check-in`): session eligibility and geolocation check-in.

The existing `/attendance` and `/attendance/meetings/:meetingId` URLs redirect to these student-only routes. The student sidebar now links to Scheduled classes. Other attendance placeholders are unchanged.

Pages use the shared cookie/CSRF client and the backend `docs/api/attendance.md` contract. Eligibility and attendance status come from the server. Refresh retrieves current eligibility when a class starts or ends. Each explicit check-in attempt requests one fresh location reading; requests are not automatically replayed. Leaving the page prevents a pending location callback from submitting a check-in.

Mock authentication deliberately blocks live API calls. These pages explain that limitation rather than presenting fictional attendance as real records.

## Verification

Run `npm test`, `npm run build`, and `npm run format:check`.

Automated attendance tests cover location options and timestamp mapping, denied/unavailable/timed-out location, unsupported browsers, present/late API confirmations, cookie/CSRF integration, pagination, cancellation signal propagation, API failures without mutation replay, error messages, role guards, and legacy redirects.

For end-to-end verification, start the backend Docker stack with `FRONTEND_MOCK_AUTH=false` and sign in as an enrolled student. Check both routes at 390px, 768px, and 1280px, including keyboard navigation:

- Upcoming, in-progress, ended, and cancelled sessions; pending/present/late/absent records and null unmaterialised records.
- Empty, loading, unavailable/forbidden, and paginated results.
- Present and late check-ins, confirmed timestamp, and already checked-in state.
- Location permission denial, unavailable location, timeout, inaccurate/stale readings, and outside-area responses; retry should request a new reading.
- Repeated clicks while finding location/submitting; leaving the route while location is pending.
- Server eligibility changing between detail load and submission; explicit refresh after a session begins.

Initial implementation checks passed locally. Browser smoke checks confirmed both routes and mock-mode error handling. Full Docker/API and populated responsive verification remain outstanding: the Docker daemon was unavailable, and the checked-in backend specification marks attendance endpoints as planned.
