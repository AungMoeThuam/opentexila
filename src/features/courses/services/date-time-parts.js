// A date and a time of day as three separate choices (date, hour, minute), so
// nobody has to type a time. The joined value has the same shape as a
// datetime-local input, "2026-11-20T09:00", which the rest of the form uses.

export const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);

const STEP_MINUTES = Array.from({ length: 12 }, (_, step) =>
  String(step * 5).padStart(2, '0'),
);

// Used when the admin picks a date before a time.
export const DEFAULT_PICK_TIME = Object.freeze({ hour: '09', minute: '00' });

// The minutes to offer: every 5 minutes. A minute that is already set but is
// not on that list (for example from an older session) stays available, so
// the field never hides the value it holds.
export function minuteOptions(current = '') {
  if (/^\d{2}$/.test(current) && Number(current) < 60) {
    if (!STEP_MINUTES.includes(current))
      return [...STEP_MINUTES, current].sort();
  }
  return STEP_MINUTES;
}

const PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/;

// "2026-11-20T09:05" becomes { date, hour, minute }. Anything else is empty.
export function splitDateTime(value) {
  const match = typeof value === 'string' ? PATTERN.exec(value) : null;
  if (!match) return { date: '', hour: '', minute: '' };
  return { date: match[1], hour: match[2], minute: match[3] };
}

// The three parts back into one value, or '' while one of them is missing.
export function joinDateTime({ date, hour, minute }) {
  return date && hour !== '' && minute !== ''
    ? `${date}T${hour}:${minute}`
    : '';
}

// When a date is chosen before a time, start at the default time.
export function withDefaultTime(parts) {
  if (!parts.date) return parts;
  return {
    date: parts.date,
    hour: parts.hour === '' ? DEFAULT_PICK_TIME.hour : parts.hour,
    minute: parts.minute === '' ? DEFAULT_PICK_TIME.minute : parts.minute,
  };
}
