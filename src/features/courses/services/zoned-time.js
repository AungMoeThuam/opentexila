// Admin times are typed and shown in one time zone, and sent to the API as UTC.
// A <input type="datetime-local"> value has no zone ("2026-11-20T09:00"), so
// these helpers read it in the admin zone and convert in both directions.

export const ADMIN_TIME_ZONE = 'Asia/Kuala_Lumpur';
export const ADMIN_TIME_ZONE_LABEL = 'Kuala Lumpur time (UTC+8)';

const INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// Minutes that `timeZone` is ahead of UTC at this moment.
function offsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  const asUtc = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

// "2026-11-20T09:00" in the admin zone -> a Date. Null for text that is not a
// real date and time.
export function zonedInputToDate(value, timeZone = ADMIN_TIME_ZONE) {
  const match = INPUT.exec(typeof value === 'string' ? value : '');
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(guess);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  )
    return null;
  // Two passes handle a zone whose offset changes close to this time.
  let result = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  result = guess - offsetMinutes(new Date(result), timeZone) * 60000;
  return new Date(result);
}

// A Date or UTC text -> "2026-11-20T09:00" in the admin zone. Empty if invalid.
export function dateToZonedInput(value, timeZone = ADMIN_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(
    date.getTime() + offsetMinutes(date, timeZone) * 60000,
  );
  return shifted.toISOString().slice(0, 16);
}

// Moves a zoned input value by a number of minutes ("" if the value is wrong).
export function addMinutesToInput(value, minutes, timeZone = ADMIN_TIME_ZONE) {
  const date = zonedInputToDate(value, timeZone);
  return date
    ? dateToZonedInput(new Date(date.getTime() + minutes * 60000), timeZone)
    : '';
}
