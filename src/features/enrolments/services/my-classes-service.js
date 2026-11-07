import { createClassListRequest } from './class-list-request.js';

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
    list: createClassListRequest({ api, buildPath: buildMyClassesPath }),
  };
}
