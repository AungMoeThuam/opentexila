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

export function validateCourseId(raw) {
  if (raw === undefined || raw === null) {
    return { valid: true, value: undefined };
  }

  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw) || raw < 1) {
      return {
        valid: false,
        error: 'Course ID must be a positive integer (e.g. 101).',
      };
    }
    return { valid: true, value: raw };
  }

  const str = String(raw).trim();
  if (str === '') {
    return { valid: true, value: undefined };
  }

  if (!/^[1-9]\d*$/.test(str)) {
    return {
      valid: false,
      error: 'Course ID must be a positive integer (e.g. 101).',
    };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || num < 1) {
    return {
      valid: false,
      error: 'Course ID must be a positive integer (e.g. 101).',
    };
  }

  return { valid: true, value: num };
}

function parseCourseId(value) {
  const result = validateCourseId(value);
  if (!result.valid || result.value === undefined) {
    throw new RangeError('courseId must be a positive integer.');
  }
  return result.value;
}

export function buildStudentClassesPath(params = {}) {
  const { page, limit, courseId, term } = params;
  const query = new URLSearchParams();

  if (!isBlank(page)) {
    query.set('page', String(positiveInteger(page, 'page', MAX_PAGE)));
  }

  if (!isBlank(limit)) {
    query.set('limit', String(positiveInteger(limit, 'limit', MAX_LIMIT)));
  }

  if (!isBlank(courseId)) {
    query.set('courseId', String(parseCourseId(courseId)));
  }

  if (!isBlank(term)) {
    const trimmed = String(term).trim();
    if (trimmed !== '') {
      query.set('term', trimmed);
    }
  }

  const search = query.toString();
  const path = '/me/classes';
  return search ? `${path}?${search}` : path;
}
