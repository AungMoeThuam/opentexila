import { distinctValues, looseKey, tidy } from './class-suggestions.js';

// The Classes list keeps its filters in the address, for example
// /admin/classes?courseId=3&term=2026-S2. The class form reads the same
// filters, so after a save the admin comes back to the list as it was.

// A positive integer id from an address value, or null.
export function parseId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw ?? '');
  if (!/^[1-9]\d{0,9}$/.test(text)) return null;
  const id = Number(text);
  return id <= 4294967295 ? id : null;
}

// The filters in an address, checked: { courseId?, term? } as strings. Anything
// that is not a valid id or a term of 50 characters or fewer is dropped.
export function listFilterQuery(query = {}) {
  const filters = {};
  const courseId = parseId(query.courseId);
  if (courseId) filters.courseId = String(courseId);
  const raw = Array.isArray(query.term) ? query.term[0] : query.term;
  const term = typeof raw === 'string' ? tidy(raw) : '';
  if (term && term.length <= 50) filters.term = term;
  return filters;
}

// How many classes the list shows on one page.
export const CLASS_PAGE_SIZE = 20;

// The page that holds the last class when there are `total` classes. A class
// that was just created has the highest id and the list is in id order, so it
// is on this page.
export function lastPage(total, size = CLASS_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size));
}

// Where to go back to the Classes list. `highlight` is the id of a class to
// scroll to and mark, for example the class that was just saved; `page` is the
// page that holds it (the first page needs no `page`).
export function classListLocation(filters = {}, { highlight, page } = {}) {
  const query = { ...listFilterQuery(filters) };
  if (Number.isInteger(page) && page > 1) query.page = String(page);
  if (highlight) query.highlight = String(highlight);
  return { name: 'admin-classes', query };
}

// The value of the "add a new term" choice in the term list.
export const NEW_TERM = '__new__';

// The terms to offer in a list: the terms of the existing classes, one per
// spelling, and the term already chosen even if no other class uses it.
// `classes` have `id` and `term`; `excludeId` leaves the class being edited
// out of the existing terms, so its own term comes back through `current`.
export function termChoices(classes, { current = '', excludeId } = {}) {
  const choices = distinctValues(classes, 'term', { excludeId }).map(
    (option) => option.value,
  );
  const chosen = tidy(current);
  if (chosen && !choices.some((value) => looseKey(value) === looseKey(chosen)))
    choices.push(chosen);
  return choices.sort((a, b) => a.localeCompare(b));
}

// The term in the list that is the same as `value`, however it is spelled, or
// '' when there is none.
export function matchingTerm(choices, value) {
  const key = looseKey(tidy(value));
  if (!key) return '';
  return choices.find((choice) => looseKey(choice) === key) ?? '';
}
