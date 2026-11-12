import { ApiError } from '../../../shared/services/api-client.js';

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const MAX_ID = 4294967295;
const STATES = ['scheduled', 'cancelled'];

function positiveInteger(value, name, max) {
  const number =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  return number;
}

const invalid = (what) =>
  new ApiError(`The server returned an unexpected ${what}.`, {
    code: 'INVALID_RESPONSE',
  });

function expectSession(item) {
  if (
    !item ||
    typeof item !== 'object' ||
    !Number.isInteger(item.id) ||
    !STATES.includes(item.state) ||
    typeof item.availability !== 'string' ||
    typeof item.starts_at !== 'string'
  )
    throw invalid('session');
  return item;
}

// Builds /classes/:classId/class-sessions with optional paging and a state filter.
export function buildSessionsPath(classId, { page, limit, state } = {}) {
  const id = positiveInteger(classId, 'classId', MAX_ID);
  const query = new URLSearchParams();
  if (page !== undefined && page !== '')
    query.set('page', String(positiveInteger(page, 'page', MAX_PAGE)));
  if (limit !== undefined && limit !== '')
    query.set('limit', String(positiveInteger(limit, 'limit', MAX_LIMIT)));
  if (state !== undefined && state !== '') {
    if (!STATES.includes(state)) throw new RangeError('Unknown state.');
    query.set('state', state);
  }
  const string = query.toString();
  return `/classes/${id}/class-sessions${string ? `?${string}` : ''}`;
}

// list, create, cancel and updatePolicy, as in backend/docs/api/attendance.md. list resolves
// to { data, meta, context: { class } }; create and cancel resolve to the session.
export function createClassSessionsService({ api }) {
  return {
    async list(classId, params = {}, { signal } = {}) {
      const payload = await api.request(buildSessionsPath(classId, params), {
        signal,
      });
      if (
        !Array.isArray(payload?.data) ||
        !payload?.meta ||
        !Number.isInteger(payload.meta.totalPages)
      )
        throw invalid('session list');
      payload.data.forEach(expectSession);
      return payload;
    },
    async create(classId, body, { signal } = {}) {
      const id = positiveInteger(classId, 'classId', MAX_ID);
      const payload = await api.request(`/classes/${id}/class-sessions`, {
        method: 'POST',
        body,
        signal,
      });
      return expectSession(payload?.data);
    },
    // Changes the venue and the late time of one session that has not started.
    // `body` holds any of room_label, latitude, longitude, radius_m, late_after.
    async updatePolicy(classSessionId, body, { signal } = {}) {
      const id = positiveInteger(classSessionId, 'classSessionId', MAX_ID);
      const payload = await api.request(
        `/class-sessions/${id}/attendance-policy`,
        { method: 'PATCH', body, signal },
      );
      return expectSession(payload?.data);
    },
    async cancel(classSessionId, { signal } = {}) {
      const id = positiveInteger(classSessionId, 'classSessionId', MAX_ID);
      const payload = await api.request(`/class-sessions/${id}/cancel`, {
        method: 'POST',
        signal,
      });
      return expectSession(payload?.data);
    },
  };
}
