import { ApiError } from '../../../shared/services/api-client.js';

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const MAX_ID = 4294967295;

function positiveInteger(value, name, max) {
  const number =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  return number;
}

const resourceId = (value, name) => positiveInteger(value, name, MAX_ID);

// Builds `/courses` or `/lecturers` list paths with optional paging and search.
export function buildOptionsPath(base, { page, limit, q } = {}) {
  const query = new URLSearchParams();
  if (page !== undefined && page !== '')
    query.set('page', String(positiveInteger(page, 'page', MAX_PAGE)));
  if (limit !== undefined && limit !== '')
    query.set('limit', String(positiveInteger(limit, 'limit', MAX_LIMIT)));
  const search = typeof q === 'string' ? q.trim() : '';
  if (search.length > 100)
    throw new RangeError('Search must be 100 characters or fewer.');
  if (search) query.set('q', search);
  const string = query.toString();
  return string ? `${base}?${string}` : base;
}

function expectList(payload, what) {
  if (
    !Array.isArray(payload?.data) ||
    !payload?.meta ||
    !Number.isInteger(payload.meta.totalPages)
  )
    throw new ApiError(`The server returned an unexpected ${what} list.`, {
      code: 'INVALID_RESPONSE',
    });
  return payload;
}

function expectItem(payload, what) {
  if (!payload?.data || typeof payload.data !== 'object' || !payload.data.id)
    throw new ApiError(`The server returned an unexpected ${what}.`, {
      code: 'INVALID_RESPONSE',
    });
  return payload.data;
}

// Loads every page of a selector list (each page is at most 100 rows).
export async function listAll(list, { signal, maxPages = 20 } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await list({ page, limit: MAX_LIMIT }, { signal });
    rows.push(...result.data);
    if (page >= result.meta.totalPages) break;
  }
  return rows;
}

export function createCoursesService({ api }) {
  return {
    async list(params = {}, { signal } = {}) {
      const payload = await api.request(buildOptionsPath('/courses', params), {
        signal,
      });
      return expectList(payload, 'course');
    },
    async create(body, { signal } = {}) {
      const payload = await api.request('/courses', {
        method: 'POST',
        body,
        signal,
      });
      return expectItem(payload, 'course');
    },
    async update(courseId, body, { signal } = {}) {
      const id = resourceId(courseId, 'courseId');
      const payload = await api.request(`/courses/${id}`, {
        method: 'PATCH',
        body,
        signal,
      });
      return expectItem(payload, 'course');
    },
  };
}

export function createLecturersService({ api }) {
  return {
    async list(params = {}, { signal } = {}) {
      const payload = await api.request(
        buildOptionsPath('/lecturers', params),
        { signal },
      );
      return expectList(payload, 'lecturer');
    },
  };
}

export function createClassManagementService({ api }) {
  return {
    async get(classId, { signal } = {}) {
      const id = resourceId(classId, 'classId');
      return expectItem(
        await api.request(`/classes/${id}`, { signal }),
        'class',
      );
    },
    async create(body, { signal } = {}) {
      const payload = await api.request('/classes', {
        method: 'POST',
        body,
        signal,
      });
      return expectItem(payload, 'class');
    },
    async update(classId, body, { signal } = {}) {
      const id = resourceId(classId, 'classId');
      const payload = await api.request(`/classes/${id}`, {
        method: 'PATCH',
        body,
        signal,
      });
      return expectItem(payload, 'class');
    },
  };
}
