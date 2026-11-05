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

function parseClassId(value) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new RangeError('classId must be a positive integer.');
  }
  return id;
}

export function buildClassRosterPath(classId, params = {}) {
  const id = parseClassId(classId);
  const { page, limit } = params;
  const query = new URLSearchParams();

  if (!isBlank(page))
    query.set('page', positiveInteger(page, 'page', MAX_PAGE));
  if (!isBlank(limit)) {
    query.set('limit', positiveInteger(limit, 'limit', MAX_LIMIT));
  }

  const search = query.toString();
  const path = `/classes/${id}/enrolments`;
  return search ? `${path}?${search}` : path;
}
