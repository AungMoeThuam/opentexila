const BASE_PATH = '/me/class-sessions';
const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

function positiveInteger(value, name, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  }
  return value;
}

function parseDate(value, name) {
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new RangeError(`${name} must be a Date or a date string.`);
  }
  const date = value instanceof Date ? value : new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date.`);
  }
  return date;
}

export function buildClassSessionsPath(params = {}) {
  const { page, limit, classId, from, to } = params;
  const query = new URLSearchParams();

  if (!isBlank(page)) {
    query.set('page', positiveInteger(page, 'page', MAX_PAGE));
  }
  if (!isBlank(limit)) {
    query.set('limit', positiveInteger(limit, 'limit', MAX_LIMIT));
  }
  if (!isBlank(classId)) {
    query.set(
      'classId',
      positiveInteger(classId, 'classId', Number.MAX_SAFE_INTEGER),
    );
  }

  const fromDate = isBlank(from) ? undefined : parseDate(from, 'from');
  const toDate = isBlank(to) ? undefined : parseDate(to, 'to');
  if (fromDate && toDate && fromDate.getTime() >= toDate.getTime()) {
    throw new RangeError('from must be earlier than to.');
  }
  if (fromDate) query.set('from', fromDate.toISOString());
  if (toDate) query.set('to', toDate.toISOString());

  const search = query.toString();
  return search ? `${BASE_PATH}?${search}` : BASE_PATH;
}
