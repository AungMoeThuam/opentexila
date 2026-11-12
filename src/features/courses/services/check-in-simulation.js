// A "what if" calculator for a session's attendance settings. It answers what
// would happen if a student checked in at some place and time, using the same
// rules as the server (backend/src/attendance/attendance.service.ts and
// attendance.rules.ts). It never calls the server and never saves anything. The
// server still decides at a real check-in.
import { formatTime } from '../../../shared/utils/format-datetime.js';
import { ADMIN_TIME_ZONE } from './zoned-time.js';

// The server uses this Earth radius and the haversine formula.
export const EARTH_RADIUS_M = 6371000;
const METRES_PER_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180;
const MINUTE = 60000;
// How far before the start and after the end the time slider reaches.
export const SLIDER_MARGIN_MINUTES = 30;

const rad = (value) => (value * Math.PI) / 180;

// Distance in metres between two { lat, lng } points. The same formula as
// distanceMeters on the server, so the two agree.
export function distanceBetween(from, to) {
  const a =
    Math.sin(rad(to.lat - from.lat) / 2) ** 2 +
    Math.cos(rad(from.lat)) *
      Math.cos(rad(to.lat)) *
      Math.sin(rad(to.lng - from.lng) / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// The point this many metres due north of `center`. It is how the distance box
// places the test student. The latitude is kept in range.
export function pointAtDistance(center, meters) {
  const lat = center.lat + meters / METRES_PER_DEGREE;
  return { lat: Math.max(-90, Math.min(90, lat)), lng: center.lng };
}

const deg = (value) => (value * 180) / Math.PI;

// The direction from one point to another, in degrees clockwise from north
// (0 north, 90 east, 180 south, 270 west).
export function bearingBetween(from, to) {
  const dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// The point this many metres from `center` in a direction (degrees clockwise
// from north). The longitude is kept in -180..180.
export function pointAtBearing(center, meters, bearing) {
  const angle = meters / EARTH_RADIUS_M;
  const theta = rad(bearing);
  const lat = Math.asin(
    Math.sin(rad(center.lat)) * Math.cos(angle) +
      Math.cos(rad(center.lat)) * Math.sin(angle) * Math.cos(theta),
  );
  const lng =
    rad(center.lng) +
    Math.atan2(
      Math.sin(theta) * Math.sin(angle) * Math.cos(rad(center.lat)),
      Math.cos(angle) - Math.sin(rad(center.lat)) * Math.sin(lat),
    );
  return { lat: deg(lat), lng: ((((deg(lng) + 180) % 360) + 360) % 360) - 180 };
}

// When the classroom pin moves from `previous` to `next`, the test student moves
// with it and keeps the same distance and direction from the pin. Without a
// previous pin, a new pin or a test student, nothing follows and the point stays.
export function followProbe({ previous, next, probe }) {
  if (!previous || !next || !probe) return probe;
  const distance = distanceBetween(previous, probe);
  const bearing = distance === 0 ? 0 : bearingBetween(previous, probe);
  return pointAtBearing(next, distance, bearing);
}

// The check-in time `offsetMinutes` after the start, as UTC text.
export function checkInTime(startsAt, offsetMinutes) {
  return new Date(Date.parse(startsAt) + offsetMinutes * MINUTE).toISOString();
}

// The slider's range in minutes from the start: a margin before the start and
// after the end.
export function offsetRange(startsAt, endsAt) {
  const length = Math.round(
    (Date.parse(endsAt) - Date.parse(startsAt)) / MINUTE,
  );
  return {
    min: -SLIDER_MARGIN_MINUTES,
    max: (Number.isFinite(length) ? length : 0) + SLIDER_MARGIN_MINUTES,
  };
}

export const OUTCOMES = {
  present: { label: 'Present', modifier: 'present' },
  late: { label: 'Late', modifier: 'late' },
  outside: { label: 'Outside the area', modifier: 'absent' },
  not_open: { label: 'Not open yet', modifier: 'upcoming' },
  closed: { label: 'Closed', modifier: 'closed' },
  cancelled: { label: 'Cancelled', modifier: 'closed' },
};

const metres = (value) => `${Math.round(value * 10) / 10} m`;

// Decides one imagined check-in. `session` has `state`, `startsAt`, `lateAfter`
// and `endsAt` (UTC text). `center` and `student` are { lat, lng }. `radius` is
// in metres. `at` is the check-in time (a Date or UTC text). Returns
// { outcome, distance, message }. The order of the checks follows the server:
// cancelled, not open yet, closed, then the place, then Present or Late.
// Boundaries: the start is inclusive, a check-in at the late time is still
// Present, the end is exclusive, and a distance equal to the radius is inside.
export function simulateCheckIn({
  session,
  center,
  radius,
  student,
  at,
  timeZone = ADMIN_TIME_ZONE,
}) {
  const when = Date.parse(at instanceof Date ? at.toISOString() : at);
  const starts = Date.parse(session?.startsAt);
  const late = Date.parse(session?.lateAfter);
  const ends = Date.parse(session?.endsAt);
  if (
    !center ||
    !student ||
    !Number.isFinite(radius) ||
    ![when, starts, late, ends].every(Number.isFinite)
  )
    return { outcome: 'incomplete', distance: null, message: '' };
  const time = (ms) => formatTime(new Date(ms).toISOString(), { timeZone });
  const distance = distanceBetween(center, student);
  const done = (outcome, message) => ({ outcome, distance, message });

  if (session.state === 'cancelled')
    return done(
      'cancelled',
      'This session is cancelled, so nobody can check in.',
    );
  if (when < starts)
    return done(
      'not_open',
      `Check-in opens at ${time(starts)}. At ${time(when)} it is not open yet.`,
    );
  if (when >= ends)
    return done(
      'closed',
      `Check-in closed at ${time(ends)}. At ${time(when)} it is too late.`,
    );
  if (distance > radius)
    return done(
      'outside',
      `At ${time(when)}, ${metres(distance)} from the pin is outside the ${metres(radius)} area, so the check-in is refused.`,
    );
  if (when <= late)
    return done(
      'present',
      `At ${time(when)}, ${metres(distance)} from the pin (inside ${metres(radius)}), the student is Present: ${time(when)} is not after ${time(late)}.`,
    );
  return done(
    'late',
    `At ${time(when)}, ${metres(distance)} from the pin (inside ${metres(radius)}), the student is Late: ${time(when)} is after ${time(late)}.`,
  );
}
