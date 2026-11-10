import { ApiError } from '../../../shared/services/api-client.js';

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const MAX_ID = 4294967295;
const ROLES = ['student', 'lecturer', 'admin'];

function integerInRange(value, name, max) {
  const number =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  return number;
}

// Builds `/admin/users` with optional paging, search and role filter.
export function buildUsersPath({ page, limit, search, role } = {}) {
  const query = new URLSearchParams();
  if (page !== undefined && page !== '')
    query.set('page', String(integerInRange(page, 'page', MAX_PAGE)));
  if (limit !== undefined && limit !== '')
    query.set('limit', String(integerInRange(limit, 'limit', MAX_LIMIT)));
  const text = typeof search === 'string' ? search.trim() : '';
  if (text.length > 100)
    throw new RangeError('Search must be 100 characters or fewer.');
  if (text) query.set('search', text);
  if (role !== undefined && role !== '') {
    if (!ROLES.includes(role))
      throw new RangeError('role must be student, lecturer or admin.');
    query.set('role', role);
  }
  const string = query.toString();
  return string ? `/admin/users?${string}` : '/admin/users';
}

const invalid = (what) =>
  new ApiError(`The server returned an unexpected ${what}.`, {
    code: 'INVALID_RESPONSE',
  });

export function createAdminUsersService({ api }) {
  return {
    async list(params = {}, { signal } = {}) {
      const payload = await api.request(buildUsersPath(params), { signal });
      if (
        !Array.isArray(payload?.data) ||
        !payload?.meta ||
        !Number.isInteger(payload.meta.totalPages)
      )
        throw invalid('user list');
      return payload;
    },
    async create(body, { signal } = {}) {
      const payload = await api.request('/admin/users', {
        method: 'POST',
        body,
        signal,
      });
      if (!payload?.data?.id) throw invalid('account');
      return payload.data;
    },
    // Success is 204 with no body.
    async resetPassword(userId, body, { signal } = {}) {
      const id = integerInRange(userId, 'userId', MAX_ID);
      await api.request(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body,
        signal,
      });
    },
  };
}
