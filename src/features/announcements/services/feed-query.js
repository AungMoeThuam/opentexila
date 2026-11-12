import { CATEGORIES, SORTS } from './announcement-options.js';

// The feed keeps its filters in the address (?classId=1&category=exam), so a
// reload, a shared link or the Back button restores the same view.
export const FEED_DEFAULTS = Object.freeze({
  classId: '',
  search: '',
  category: '',
  sort: 'newest',
  page: 1,
});

const first = (value) => (Array.isArray(value) ? value[0] : value);

// Unknown or invalid values fall back to the defaults.
export function parseFeedQuery(query = {}) {
  const state = { ...FEED_DEFAULTS };
  const classId = String(first(query.classId) ?? '');
  if (/^[1-9]\d{0,9}$/.test(classId) && Number(classId) <= 4294967295)
    state.classId = classId;
  const search = first(query.search);
  if (
    typeof search === 'string' &&
    search.trim() &&
    search.trim().length <= 100
  )
    state.search = search.trim();
  const category = first(query.category);
  if (CATEGORIES.some((item) => item.value === category))
    state.category = category;
  const sort = first(query.sort);
  if (SORTS.some((item) => item.value === sort)) state.sort = sort;
  const page = String(first(query.page) ?? '');
  if (/^[1-9]\d{0,4}$/.test(page) && Number(page) <= 10000)
    state.page = Number(page);
  return state;
}

// Only values that differ from the defaults go into the address.
export function buildFeedQuery(state = {}) {
  const query = {};
  if (state.classId) query.classId = String(state.classId);
  if (state.search) query.search = state.search;
  if (state.category) query.category = state.category;
  if (state.sort && state.sort !== FEED_DEFAULTS.sort) query.sort = state.sort;
  if (state.page > 1) query.page = String(state.page);
  return query;
}

export const sameFeedQuery = (a, b) =>
  JSON.stringify(buildFeedQuery(parseFeedQuery(a))) ===
  JSON.stringify(buildFeedQuery(parseFeedQuery(b)));
