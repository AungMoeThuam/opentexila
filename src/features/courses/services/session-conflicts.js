// Finds the sessions that clash with a session being scheduled, using the same
// rules as the server (backend/docs/api/attendance.md): another scheduled
// session overlaps in time and shares the class, the lecturer or the room.
// The result has the shape of `error.conflicts` in the server's 409 answer, so
// one list component shows both.
import { sessionsOverlap } from '../../scheduling/utils/schedule-conflicts.js';

export const MAX_LISTED_CONFLICTS = 10;
const DAY_MS = 86400000;

const isoDate = (date) => date.toISOString().slice(0, 10);

// The timetable list takes calendar dates, read as UTC days. A day either side
// covers every time zone, and the real overlap is checked afterwards.
export function conflictRange(start, end) {
  return {
    from: isoDate(new Date(start.getTime() - DAY_MS)),
    to: isoDate(new Date(end.getTime() + DAY_MS)),
  };
}

// The server compares rooms by lower case and trimmed text.
const roomKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

// `sessions` are timetable sessions (`class_id`, `course`, `section`,
// `lecturer`, `room_label`, `starts_at`, `ends_at`, `status`). `target` is the
// class being scheduled: { classId, lecturerId, room }. `start` and `end` are
// Dates. Returns [{ types, session }], early to late, at most ten.
export function findSessionConflicts(
  sessions,
  { classId, lecturerId, room, start, end },
) {
  if (!start || !end || end.getTime() <= start.getTime()) return [];
  const proposed = {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  };
  const found = [];
  for (const session of sessions) {
    if (session.status !== 'scheduled') continue;
    if (!sessionsOverlap(session, proposed)) continue;
    const types = [];
    if (classId != null && session.class_id === classId) types.push('class');
    if (lecturerId != null && session.lecturer?.id === lecturerId)
      types.push('lecturer');
    if (roomKey(room) && roomKey(session.room_label) === roomKey(room))
      types.push('room');
    if (!types.length) continue;
    found.push({
      types,
      session: {
        id: session.id,
        class: {
          id: session.class_id,
          course: { code: session.course?.code, name: session.course?.name },
          section: session.section,
          term: session.term,
        },
        lecturer: session.lecturer,
        room_label: session.room_label,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
      },
    });
  }
  return found
    .sort(
      (a, b) =>
        Date.parse(a.session.starts_at) - Date.parse(b.session.starts_at) ||
        a.session.id - b.session.id,
    )
    .slice(0, MAX_LISTED_CONFLICTS);
}

export const CONFLICT_LABELS = {
  class: 'Same class',
  lecturer: 'Same lecturer',
  room: 'Same room',
};

// "Same lecturer and same room". Only the first word is capitalised.
export function reasonText(types) {
  const labels = types.map((type) => CONFLICT_LABELS[type] ?? type);
  const text = labels.map((label, index) =>
    index === 0 ? label : label.toLowerCase(),
  );
  if (text.length < 2) return text[0] ?? '';
  return `${text.slice(0, -1).join(', ')} and ${text.at(-1)}`;
}
