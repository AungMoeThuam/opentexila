// Rules and text for the attendance settings of ONE session (Phase B of the
// geofence editor). They mirror backend/docs/api/attendance.md, section
// "PATCH /class-sessions/:classSessionId/attendance-policy". The server checks
// everything again, and refuses a session that has started.
import {
  formatSessionWindow,
  formatTime,
} from '../../../shared/utils/format-datetime.js';
import { MAX_RADIUS_M, MIN_RADIUS_M } from './course-class-validation.js';
import { toLatitude, toLongitude, toRadius } from './geofence.js';
import { MAX_LATE_MINUTES } from './late-allowance.js';
import { ADMIN_TIME_ZONE } from './zoned-time.js';

const MINUTE = 60000;
export const MAX_ROOM_LENGTH = 100;

// Only a scheduled session that has not started can change.
export function isEditable(session) {
  return session?.state === 'scheduled' && session?.availability === 'upcoming';
}

// "Thu, 20 Nov 2026 · 09:00–11:00" for the session picker.
export function sessionOptionLabel(session) {
  const { date, time } = formatSessionWindow(
    session.starts_at,
    session.ends_at,
  );
  return `${date} · ${time}`;
}

// The late allowance of a saved session: whole minutes after the start.
export function lateMinutesOf(session) {
  const minutes =
    (Date.parse(session.late_after) - Date.parse(session.starts_at)) / MINUTE;
  return Number.isFinite(minutes) ? Math.round(minutes) : '';
}

// The longest allowance that is still before the end of the session, in whole
// minutes (the late time must be before the end).
export function sessionLateLimit(session) {
  const length =
    (Date.parse(session.ends_at) - Date.parse(session.starts_at)) / MINUTE;
  return Number.isFinite(length) ? Math.max(0, Math.ceil(length) - 1) : 0;
}

// The longest allowance an admin may set for this session: the app's limit, or
// less when the session is short.
export function maxLateMinutes(session) {
  return Math.min(MAX_LATE_MINUTES, sessionLateLimit(session));
}

// The message for a late allowance that is longer than this session allows, or
// '' when it is not too long (or is not a number yet). It is also shown while
// the admin types, so a long value is seen at once and not only when saving.
export function lateTooLongMessage(minutes, session) {
  const limit = session ? maxLateMinutes(session) : 0;
  const value = minutes === '' || minutes == null ? NaN : Number(minutes);
  if (!session || !Number.isInteger(value) || value <= limit) return '';
  return limit < MAX_LATE_MINUTES
    ? `Late allowance must be at most ${limit} minutes, so the late time is before the session ends.`
    : `Late allowance must be at most ${limit} minutes.`;
}

// The absolute late time for a start time and an allowance in minutes.
export function lateAfterFrom(startsAt, minutes) {
  return new Date(
    Date.parse(startsAt) + Number(minutes) * MINUTE,
  ).toISOString();
}

// The values the form edits, from a saved session.
export function policyFormValues(session) {
  return {
    room_label: session?.room_label ?? '',
    latitude: session ? Number(session.latitude) : '',
    longitude: session ? Number(session.longitude) : '',
    radius_m: session ? Number(session.radius_m) : '',
    late_minutes: session ? lateMinutesOf(session) : '',
  };
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Checks the form values for this session. Returns { valid, errors, payload }
// where payload is what the API takes (all five fields).
export function validatePolicy(values = {}, session) {
  const errors = {};
  const room = text(values.room_label);
  if (!room) errors.room_label = 'Room is required.';
  else if (room.length > MAX_ROOM_LENGTH)
    errors.room_label = `Room must be at most ${MAX_ROOM_LENGTH} characters.`;

  const latitude = toLatitude(values.latitude);
  if (latitude === null)
    errors.latitude =
      values.latitude === '' || values.latitude == null
        ? 'Latitude is required.'
        : 'Latitude must be a number from -90 to 90.';
  const longitude = toLongitude(values.longitude);
  if (longitude === null)
    errors.longitude =
      values.longitude === '' || values.longitude == null
        ? 'Longitude is required.'
        : 'Longitude must be a number from -180 to 180.';
  const radius = toRadius(values.radius_m);
  if (radius === null)
    errors.radius_m =
      values.radius_m === '' || values.radius_m == null
        ? 'Attendance radius is required.'
        : `Attendance radius must be a number from ${MIN_RADIUS_M} to ${MAX_RADIUS_M} metres.`;

  const raw = values.late_minutes;
  const minutes = raw === '' || raw == null ? NaN : Number(raw);
  const limit = session ? maxLateMinutes(session) : 0;
  if (raw === '' || raw == null)
    errors.late_minutes = 'Late allowance is required.';
  else if (!Number.isInteger(minutes) || minutes < 0)
    errors.late_minutes =
      'Late allowance must be a whole number of minutes, 0 or more.';
  else if (session && minutes > limit)
    errors.late_minutes = lateTooLongMessage(minutes, session);

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    payload: valid
      ? {
          room_label: room,
          latitude,
          longitude,
          radius_m: radius,
          late_after: lateAfterFrom(session.starts_at, minutes),
        }
      : {},
  };
}

// The fields of `payload` that differ from the saved session. The API sends
// decimals as text ("75.00"), so numbers are compared as numbers.
export function changedPolicyFields(payload, session) {
  const changes = {};
  if (payload.room_label !== session.room_label)
    changes.room_label = payload.room_label;
  for (const field of ['latitude', 'longitude', 'radius_m']) {
    if (Math.abs(payload[field] - Number(session[field])) > 1e-9)
      changes[field] = payload[field];
  }
  if (Date.parse(payload.late_after) !== Date.parse(session.late_after))
    changes.late_after = payload.late_after;
  return changes;
}

// One sentence on what students will experience with these settings. Empty
// until the values can be used.
export function policySummary(
  values = {},
  session,
  { timeZone = ADMIN_TIME_ZONE } = {},
) {
  if (!session) return '';
  const radius = toRadius(values.radius_m);
  const minutes = Number(values.late_minutes);
  const room = text(values.room_label);
  if (
    radius === null ||
    !room ||
    values.late_minutes === '' ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > maxLateMinutes(session)
  )
    return '';
  const time = (iso) => formatTime(iso, { timeZone });
  const late = lateAfterFrom(session.starts_at, minutes);
  return `Check-in opens at ${time(session.starts_at)} and closes at ${time(session.ends_at)}. A check-in up to ${time(late)} is Present, and a later one is Late. Students must be within ${radius} m of the pin (${room}).`;
}

// How far the form differs from the class defaults, for the "this session only"
// note: true when the room, the point or the radius is not the class's.
export function differsFromClass(values, classInfo) {
  if (!classInfo) return false;
  return (
    text(values.room_label) !== classInfo.room_label ||
    Math.abs(Number(values.latitude) - Number(classInfo.latitude)) > 1e-9 ||
    Math.abs(Number(values.longitude) - Number(classInfo.longitude)) > 1e-9 ||
    Number(values.radius_m) !== Number(classInfo.radius_m)
  );
}
