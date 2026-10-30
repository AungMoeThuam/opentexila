const BASE_PATH = '/class-sessions';
const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const STATUSES = ['pending', 'present', 'late', 'absent'];

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

function parseClassSessionId(value) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new RangeError('classSessionId must be a positive integer.');
  }
  return id;
}

export function buildClassSessionRecordsPath(classSessionId, params = {}) {
  const id = parseClassSessionId(classSessionId);
  const { page, limit, status } = params;
  const query = new URLSearchParams();

  if (!isBlank(page)) {
    query.set('page', positiveInteger(page, 'page', MAX_PAGE));
  }
  if (!isBlank(limit)) {
    query.set('limit', positiveInteger(limit, 'limit', MAX_LIMIT));
  }
  if (!isBlank(status)) {
    if (!STATUSES.includes(status)) {
      throw new RangeError(`status must be one of ${STATUSES.join(', ')}.`);
    }
    query.set('status', status);
  }

  const search = query.toString();
  const path = `${BASE_PATH}/${id}/records`;
  return search ? `${path}?${search}` : path;
}
