import { ApiError } from '../../../shared/services/api-client.js';
import { CATEGORIES, SORTS } from './announcement-options.js';

const MAX_ID = 4294967295;
const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

function positiveInteger(value, name, max) {
  const number =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new RangeError(`${name} must be an integer from 1 to ${max}.`);
  return number;
}

// Builds /announcements with optional filters (all classes the user may see).
export function buildAnnouncementsPath({
  classId,
  page,
  limit,
  search,
  category,
  sort,
} = {}) {
  const query = new URLSearchParams();
  if (classId !== undefined && classId !== '')
    query.set('classId', String(positiveInteger(classId, 'classId', MAX_ID)));
  if (page !== undefined && page !== '')
    query.set('page', String(positiveInteger(page, 'page', MAX_PAGE)));
  if (limit !== undefined && limit !== '')
    query.set('limit', String(positiveInteger(limit, 'limit', MAX_LIMIT)));
  const text = typeof search === 'string' ? search.trim() : '';
  if (text.length > 100)
    throw new RangeError('Search must be 100 characters or fewer.');
  if (text) query.set('search', text);
  if (category !== undefined && category !== '') {
    if (!CATEGORIES.some((item) => item.value === category))
      throw new RangeError('Unknown category.');
    query.set('category', category);
  }
  if (sort !== undefined && sort !== '') {
    if (!SORTS.some((item) => item.value === sort))
      throw new RangeError('Unknown sort.');
    query.set('sort', sort);
  }
  const string = query.toString();
  return string ? `/announcements?${string}` : '/announcements';
}

export function createAnnouncementsService({ api }) {
  return {
    // Resolves to { data, meta }. Each post has a `class` summary.
    async list(params = {}, { signal } = {}) {
      const payload = await api.request(buildAnnouncementsPath(params), {
        signal,
      });
      if (
        !Array.isArray(payload?.data) ||
        !payload?.meta ||
        !Number.isInteger(payload.meta.totalPages)
      )
        throw new ApiError(
          'The server returned an unexpected announcement list.',
          { code: 'INVALID_RESPONSE' },
        );
      return payload;
    },
  };
}
