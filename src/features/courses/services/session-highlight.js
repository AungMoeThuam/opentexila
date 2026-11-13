// The class schedule can open on one session, for example the session that
// overlaps the one an admin is scheduling: /admin/classes/3/schedule?session=42.

export const sessionAnchor = (id) => `session-${id}`;

// The session id in the address, or null when it is missing or not a valid id.
export function parseHighlightId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw ?? '');
  if (!/^[1-9]\d{0,9}$/.test(text)) return null;
  const id = Number(text);
  return id <= 4294967295 ? id : null;
}

// Where the link to a class schedule goes. With a session id the schedule
// highlights that session.
export function scheduleLocation(classId, sessionId) {
  return {
    name: 'admin-class-schedule',
    params: { classId },
    ...(sessionId ? { query: { session: String(sessionId) } } : {}),
  };
}
