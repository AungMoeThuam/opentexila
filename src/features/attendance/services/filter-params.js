const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MALAYSIA_DAY_START = 'T00:00:00+08:00';

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

function parseCalendarDay(value, name) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new RangeError(`${name} must be a YYYY-MM-DD date.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`${name} must be a real calendar date.`);
  }
  return date;
}

const formatDay = (date) => date.toISOString().slice(0, 10);

export function toQueryParams({ classId, from, to, page, limit } = {}) {
  const params = {};

  if (!isBlank(classId)) {
    params.classId = Number(classId);
  }

  const fromDay = isBlank(from) ? null : parseCalendarDay(from, 'from');
  const toDay = isBlank(to) ? null : parseCalendarDay(to, 'to');
  if (fromDay && toDay && fromDay > toDay) {
    throw new RangeError('Start date must be on or before end date.');
  }

  if (fromDay) {
    params.from = `${formatDay(fromDay)}${MALAYSIA_DAY_START}`;
  }
  if (toDay) {
    const nextDay = new Date(toDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    params.to = `${formatDay(nextDay)}${MALAYSIA_DAY_START}`;
  }
  if (!isBlank(page)) {
    params.page = page;
  }
  if (!isBlank(limit)) {
    params.limit = limit;
  }

  return params;
}
