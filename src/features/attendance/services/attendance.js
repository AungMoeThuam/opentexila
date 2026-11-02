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
    'Your location is not accurate enough. Move somewhere with a stronger location signal and try again.',
  OUTSIDE_ALLOWED_AREA:
    'You are outside the classroom check-in area. Go to the classroom and try again.',
  LOCATION_STALE:
    'Your location reading has expired. Try again to get a fresh reading.',
  LOCATION_DENIED:
    'Location permission was denied. Allow location access in your browser settings, then try again.',
  LOCATION_UNAVAILABLE:
    'Your location is unavailable. Enable device location services and try again.',
  LOCATION_TIMEOUT:
    'Finding your location took too long. Check your location services and try again.',
  LOCATION_UNSUPPORTED:
    'This browser cannot provide your location. Use a browser with location support over HTTPS or localhost.',
  MOCK_MODE:
    'Attendance requires a real signed-in session. Live API calls are disabled in development mock mode.',
};
export function errorMessage(error) {
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
export function readLocation(geolocation = globalThis.navigator?.geolocation) {
  return new Promise((resolve, reject) => {
    if (!geolocation) return reject({ code: 'LOCATION_UNSUPPORTED' });
    geolocation.getCurrentPosition(
      ({ coords, timestamp }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_m: coords.accuracy,
          reading_timestamp: new Date(timestamp).toISOString(),
        }),
      ({ code }) =>
        reject({
          code:
            {
              1: 'LOCATION_DENIED',
              2: 'LOCATION_UNAVAILABLE',
              3: 'LOCATION_TIMEOUT',
            }[code] || 'LOCATION_UNAVAILABLE',
        }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}
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
