// Client-side checks that mirror backend #19 (backend/docs/api/attendance.md,
// "Admin session management"). The server checks everything again, and also
// the conflicts that only it can see (duplicates and overlaps).
import { formatTime } from '../../../shared/utils/format-datetime.js';
import { MAX_LATE_MINUTES } from './late-allowance.js';
import { ADMIN_TIME_ZONE, zonedInputToDate } from './zoned-time.js';

export const DEFAULT_LATE_MINUTES = 15;
export const DEFAULT_LENGTH_MINUTES = 120;

const MINUTE = 60000;
// How long after the start the late time is, in minutes.
const lateOffset = (start, late) => (late.getTime() - start.getTime()) / MINUTE;

const LABELS = {
  starts_at: 'Start time',
  late_after: 'Late after',
  ends_at: 'End time',
};

// `values` hold datetime-local text in the admin zone. Returns
// { valid, errors, payload } where payload has UTC text for the API.
export function validateSessionForm(
  values = {},
  { now = new Date(), timeZone = ADMIN_TIME_ZONE } = {},
) {
  const errors = {};
  const dates = {};
  for (const field of Object.keys(LABELS)) {
    const raw = typeof values[field] === 'string' ? values[field].trim() : '';
    if (!raw) errors[field] = `${LABELS[field]} is required.`;
    else {
      const date = zonedInputToDate(raw, timeZone);
      if (date) dates[field] = date;
      else errors[field] = `${LABELS[field]} is not a valid date and time.`;
    }
  }
  const { starts_at: start, late_after: late, ends_at: end } = dates;
  if (start && start.getTime() <= now.getTime())
    errors.starts_at = 'The start time must be in the future.';
  if (start && end && end.getTime() <= start.getTime())
    errors.ends_at = 'The end time must be after the start time.';
  if (start && late && late.getTime() < start.getTime())
    errors.late_after = 'The late time must not be before the start time.';
  else if (late && end && late.getTime() >= end.getTime() && !errors.ends_at)
    errors.late_after = 'The late time must be before the end time.';
  else if (start && late && lateOffset(start, late) > MAX_LATE_MINUTES)
    errors.late_after = `The late time must be at most ${MAX_LATE_MINUTES} minutes after the start time.`;
  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    payload: valid
      ? {
          starts_at: start.toISOString(),
          late_after: late.toISOString(),
          ends_at: end.toISOString(),
        }
      : {},
  };
}

// One sentence that says what the times mean for students. Empty until the
// three times are usable and in order.
export function sessionSummary(
  values = {},
  { timeZone = ADMIN_TIME_ZONE } = {},
) {
  const start = zonedInputToDate(values.starts_at, timeZone);
  const late = zonedInputToDate(values.late_after, timeZone);
  const end = zonedInputToDate(values.ends_at, timeZone);
  if (!start || !late || !end) return '';
  if (late < start || late >= end || end <= start) return '';
  if (lateOffset(start, late) > MAX_LATE_MINUTES) return '';
  const time = (date) => formatTime(date.toISOString(), { timeZone });
  return `Check-in opens at ${time(start)} and closes at ${time(end)}. A check-in up to ${time(late)} is Present, and a later one is Late.`;
}
