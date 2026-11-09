const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

function positiveInteger(value, name, max) {
  const num =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (!Number.isInteger(num) || num < 1 || num > max) {
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  }
  return num;
}

export function buildAdminClassesPath(params = {}) {
  const { page, limit, courseId, term } = params;
  const query = new URLSearchParams();

  if (!isBlank(page)) {
    query.set('page', String(positiveInteger(page, 'page', MAX_PAGE)));
  }
  if (!isBlank(limit)) {
    query.set('limit', String(positiveInteger(limit, 'limit', MAX_LIMIT)));
  }
  if (!isBlank(courseId)) {
    const num =
      typeof courseId === 'string' && /^\d+$/.test(courseId.trim())
        ? Number(courseId.trim())
        : courseId;
    if (!Number.isSafeInteger(num) || num < 1 || num > 4294967295) {
      throw new RangeError('courseId must be a positive integer.');
    }
    query.set('courseId', String(num));
  }
  if (!isBlank(term)) {
    const trimmed = String(term).trim();
    if (trimmed.length > 50)
      throw new RangeError('term must be 50 chars or fewer.');
    if (trimmed !== '') query.set('term', trimmed);
  }

  const search = query.toString();
  const path = '/classes';
  return search ? `${path}?${search}` : path;
}
