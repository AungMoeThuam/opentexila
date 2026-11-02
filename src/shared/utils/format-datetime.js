const DASH = '—';
const DEFAULT_TIME_ZONE = 'Asia/Kuala_Lumpur';
const DEFAULT_LOCALE = 'en-GB';

const dashes = () => ({ date: DASH, time: DASH });

function parseIso(value) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function partsOf(options, locale, timeZone, date) {
  const formatter = new Intl.DateTimeFormat(locale, { timeZone, ...options });
  return Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
}

function shortDate(date, timeZone, locale) {
  const parts = partsOf(
    { day: 'numeric', month: 'short' },
    locale,
    timeZone,
    date,
  );
  return `${parts.day} ${parts.month}`;
}

function dayKey(date, timeZone, locale) {
  const parts = partsOf(
    { day: 'numeric', month: 'numeric', year: 'numeric' },
    locale,
    timeZone,
    date,
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function longDate(date, timeZone, locale) {
  const parts = partsOf(
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
    locale,
    timeZone,
    date,
  );
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

function clock(date, timeZone, locale) {
  const parts = partsOf(
    { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
    locale,
    timeZone,
    date,
  );
  return `${parts.hour}:${parts.minute}`;
}

export function formatDate(
  iso,
  { timeZone = DEFAULT_TIME_ZONE, locale = DEFAULT_LOCALE } = {},
) {
  try {
    const date = parseIso(iso);
    return date ? longDate(date, timeZone, locale) : DASH;
  } catch {
    return DASH;
  }
}

export function formatTime(
  iso,
  { timeZone = DEFAULT_TIME_ZONE, locale = DEFAULT_LOCALE } = {},
) {
  try {
    const date = parseIso(iso);
    return date ? clock(date, timeZone, locale) : DASH;
  } catch {
    return DASH;
  }
}

export function formatSessionWindow(
  startsAt,
  endsAt,
  { timeZone = DEFAULT_TIME_ZONE, locale = DEFAULT_LOCALE } = {},
) {
  try {
    const start = parseIso(startsAt);
    const end = parseIso(endsAt);
    if (!start || !end) return dashes();
    const crossesDay =
      dayKey(start, timeZone, locale) !== dayKey(end, timeZone, locale);
    const suffix = crossesDay
      ? ` (ends ${shortDate(end, timeZone, locale)})`
      : '';
    return {
      date: longDate(start, timeZone, locale),
      time: `${clock(start, timeZone, locale)}–${clock(end, timeZone, locale)}${suffix}`,
    };
  } catch {
    return dashes();
  }
}
