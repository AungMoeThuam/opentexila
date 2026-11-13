// The status filter of the lecturer Attendance page (#69). The sessions list
// of the API has no status filter, but every session has an `availability`
// (upcoming, in_progress, ended, cancelled). So when a status is chosen the
// page loads every session that matches the other filters, in pages of 100,
// keeps the ones with that status and pages them itself.

export const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUSES = STATUS_OPTIONS.map((option) => option.value).filter(Boolean);

export const isStatus = (value) => STATUSES.includes(value);

// A session matches when no status is chosen, or when its availability is it.
export const matchesStatus = (session, status) =>
  !isStatus(status) || session?.availability === status;

// The API allows 100 sessions on a page; this stops a very long list at 20
// pages (2000 sessions) instead of asking for ever more.
export const FETCH_LIMIT = 100;
export const MAX_FETCH_PAGES = 20;

// Every session for `params` (the class and date filters), page after page.
// `service.listMyClassSessions(params, { signal })` resolves to { data, meta }.
// Rejects with a RangeError when there are more than `maxPages` pages.
export async function fetchAllSessions(
  service,
  params,
  { signal, maxPages = MAX_FETCH_PAGES } = {},
) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await service.listMyClassSessions(
      { ...params, page, limit: FETCH_LIMIT },
      { signal },
    );
    rows.push(...result.data);
    totalPages = Number(result.meta?.totalPages) || 1;
    if (totalPages > maxPages)
      throw new RangeError(
        'Too many sessions to filter by status. Choose a class or a date range first.',
      );
    page += 1;
  } while (page <= totalPages);
  return rows;
}

// One page of `rows` with the same `meta` as the API gives: page, limit,
// total and totalPages (at least 1).
export function pageOf(rows, page, limit) {
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    data: rows.slice((current - 1) * limit, current * limit),
    meta: { page: current, limit, total: rows.length, totalPages },
  };
}
