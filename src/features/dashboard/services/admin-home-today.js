// "Today" for the admin home page: the sessions that overlap the admin's own
// calendar day. The timetable API filters by UTC calendar dates, so the page
// asks for the day before and the day after as well, then keeps only the
// sessions that overlap the local day.

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDate = (date) => date.toISOString().slice(0, 10);

// The UTC dates to request, wide enough to cover any local time zone.
export function todayRange(now = new Date()) {
  return {
    from: utcDate(new Date(now.getTime() - DAY_MS)),
    to: utcDate(new Date(now.getTime() + DAY_MS)),
  };
}

// 'cancelled' | 'upcoming' | 'in_progress' | 'ended'. These are the same words
// the API uses for `availability`, so the shared status badge can show them.
export function sessionPhase(session, now = new Date()) {
  if (session.status === 'cancelled') return 'cancelled';
  const time = now.getTime();
  if (time < new Date(session.starts_at).getTime()) return 'upcoming';
  if (time < new Date(session.ends_at).getTime()) return 'in_progress';
  return 'ended';
}

// The app shows every time in this zone (see shared/utils/format-datetime.js),
// so "today" must be a day in the same zone.
export const TIME_ZONE = 'Asia/Kuala_Lumpur';

function zoneParts(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts;
}

// The start and the end (exclusive) of the calendar day of `now` in the zone,
// as milliseconds. Zones with a daylight-saving change inside the day are not
// handled exactly; the zone used here has none.
export function dayBounds(now = new Date(), timeZone = TIME_ZONE) {
  const { year, month, day } = zoneParts(now.getTime(), timeZone);
  const midnightUtc = Date.UTC(year, month - 1, day);
  const shown = zoneParts(midnightUtc, timeZone);
  const offset =
    Date.UTC(
      shown.year,
      shown.month - 1,
      shown.day,
      shown.hour,
      shown.minute,
      shown.second,
    ) - midnightUtc;
  const start = midnightUtc - offset;
  return { start, end: start + DAY_MS };
}

// Sessions that overlap the calendar day of `now` in the app's time zone,
// earliest first, each with its `phase`. Does not change the sessions it is
// given.
export function sessionsForToday(
  sessions,
  now = new Date(),
  timeZone = TIME_ZONE,
) {
  const { start: dayStart, end: dayEnd } = dayBounds(now, timeZone);
  return sessions
    .filter(
      (session) =>
        new Date(session.starts_at).getTime() < dayEnd &&
        new Date(session.ends_at).getTime() > dayStart,
    )
    .map((session) => ({ ...session, phase: sessionPhase(session, now) }))
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() ||
        a.id - b.id,
    );
}
