import { GOOD_ENOUGH_M, readBestLocation } from './location-reading.js';

export const messages = {
  NOT_STARTED: 'This class has not started. Refresh when the session begins.',
  CLASS_NOT_STARTED:
    'This class has not started. Refresh when the session begins.',
  CLASS_ENDED: 'This class has ended. Check-in is closed.',
  CLASS_CANCELLED: 'This class has been cancelled. Check-in is unavailable.',
  ALREADY_CHECKED_IN: 'You have already checked in to this class.',
  NOT_ELIGIBLE: 'You are not eligible to check in to this class.',
  ROLE_NOT_STUDENT: 'Only students can check in.',
  LOCATION_INACCURATE:
    'Your location is not accurate enough yet. Wait a few seconds and try again. A phone with GPS works best.',
  OUTSIDE_ALLOWED_AREA:
    'You are outside the classroom check-in area. Go to the classroom and try again.',
  LOCATION_STALE:
    'Your location reading has expired. Try again to get a fresh reading.',
  LOCATION_DENIED:
    'Location permission was denied. Allow location access for this site, then try again.',
  LOCATION_UNAVAILABLE:
    'Your location is unavailable. Enable device location services and try again.',
  LOCATION_TIMEOUT:
    'Finding your location took too long. Check your location services and try again.',
  LOCATION_UNSUPPORTED:
    'This browser cannot provide your location. Use a browser with location support over HTTPS or localhost.',
  MOCK_MODE:
    'Attendance requires a real signed-in session. Live API calls are disabled in development mock mode.',
};
// The text for an error. For a location that was not accurate enough it says
// how accurate the reading was, so the student knows it is not a place problem.
// `accuracyM` is the accuracy of the reading that was sent.
export function errorMessage(error, { accuracyM } = {}) {
  if (error?.code === 'LOCATION_INACCURATE' && Number.isFinite(accuracyM)) {
    return `Your location is accurate to about ${Math.round(accuracyM)} m, but check-in needs ${GOOD_ENOUGH_M} m or better. Wait a few seconds and try again. A phone with GPS works best.`;
  }
  return (
    messages[error?.code] ||
    error?.message ||
    'The request failed. Please try again.'
  );
}
export function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}
// Reads a location good enough for a check-in; see location-reading.js.
export const readLocation = readBestLocation;
export function createAttendanceService(api) {
  const path = (id) => `/class-sessions/${encodeURIComponent(id)}`;
  return {
    list: (page, signal) =>
      api.request(`/me/class-sessions?page=${page}&limit=20`, { signal }),
    detail: (id, signal) => api.request(path(id), { signal }),
    checkIn: (id, body, signal) =>
      api.request(`${path(id)}/check-ins`, { method: 'POST', body, signal }),
  };
}
