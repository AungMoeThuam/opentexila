import { ApiError } from '../../../shared/services/api-client.js';

export function buildMyClassesPath({
  page = 1,
  limit = 20,
  courseId,
  term,
} = {}) {
  const query = new URLSearchParams();
  for (const [key, value, max] of [
    ['page', page, 10000],
    ['limit', limit, 100],
    ['courseId', courseId, 4294967295],
  ]) {
    if (value === undefined || value === '') continue;
    if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > max)
      throw new RangeError(`Invalid ${key}.`);
    query.set(key, String(value));
  }
  if (term !== undefined && term !== '') {
    if (typeof term !== 'string' || !term.trim() || term.length > 50)
      throw new RangeError('Invalid term.');
    query.set('term', term);
  }
  return `/me/classes?${query}`;
}
export function createMyClassesService({ api }) {
  return {
    async list(params, { signal } = {}) {
      const result = await api.request(buildMyClassesPath(params), { signal });
      if (
        !Array.isArray(result?.data) ||
        !result?.meta ||
        !Number.isInteger(result.meta.totalPages)
      )
        throw new ApiError('The server returned an unexpected class list.', {
          code: 'INVALID_RESPONSE',
        });
      return result;
    },
  };
}
