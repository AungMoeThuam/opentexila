import { formatSessionWindow } from '../../../shared/utils/format-datetime.js';

// What the "waiting for an attendance record" card shows for each session
// (#69). The analytics API gives the day, the start and end time and the number
// of pending students, but not the room. The room comes from the lecturer's
// session list, which has it; see use-session-rooms.js.

// The time window that holds all the sessions, to ask the session list for their
// rooms in one request. Null when no session has times.
export function roomWindow(sessions) {
  const starts = [];
  for (const session of sessions) {
    const start = Date.parse(session?.startsAt);
    if (Number.isFinite(start)) starts.push(start);
  }
  if (!starts.length) return null;
  // `to` is not included in the API, so go one minute past the latest start.
  return {
    from: new Date(Math.min(...starts)).toISOString(),
    to: new Date(Math.max(...starts) + 60_000).toISOString(),
  };
}

// session id -> room, from the rows of the session list. Rows without a room
// are left out.
export function roomsById(rows) {
  const rooms = {};
  for (const row of rows) {
    const room = row?.room_label || row?.class?.room_label;
    if (room) rooms[row.id] = room;
  }
  return rooms;
}

// "Thu, 12 Nov 2026 · 09:00–11:00 · Demo room 1 · 8 pending". A part that is
// not known is left out, so a row never shows a dash for it.
export function waitingDetails(session, rooms = {}) {
  const parts = [];
  if (session.startsAt && session.endsAt) {
    const { date, time } = formatSessionWindow(
      session.startsAt,
      session.endsAt,
    );
    parts.push(`${date}, ${time}`);
  } else if (session.date) {
    parts.push(session.date);
  }
  const room = rooms[session.classSessionId];
  if (room) parts.push(room);
  parts.push(`${session.pendingCount} pending`);
  return parts.join(' · ');
}

// The words of the card. One term everywhere: the lecturer submits the
// attendance record, and pending students are marked absent.
export const SUBMIT_LABEL = 'Submit attendance record';
export const SUBMITTING_LABEL = 'Submitting…';
export const SUBMIT_WARNING = 'Submitting marks pending students as absent.';
