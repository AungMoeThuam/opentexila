const DEFAULT_TIME_ZONE = 'Asia/Kuala_Lumpur';
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 8; // today plus the next 7 days

function zonedParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, Number(value)]),
  );
  return parts;
}

function startOfDayMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const localMidnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  const localNowAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  const offsetMs = localNowAsUtc - Math.floor(date.getTime() / 1000) * 1000;
  return localMidnightAsUtc - offsetMs;
}

export function homeSessionsWindow(now, { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const start = startOfDayMs(now, timeZone);
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + WINDOW_DAYS * DAY_MS).toISOString(),
  };
}

export function groupHomeSessions(
  sessions,
  now,
  { timeZone = DEFAULT_TIME_ZONE } = {},
) {
  const todayStart = startOfDayMs(now, timeZone);
  const tomorrowStart = todayStart + DAY_MS;
  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id - b.id,
  );
  const today = [];
  const upcoming = [];
  for (const session of sorted) {
    const startMs = Date.parse(session.starts_at);
    if (startMs < todayStart) continue;
    (startMs < tomorrowStart ? today : upcoming).push(session);
  }
  return { today, upcoming };
}
