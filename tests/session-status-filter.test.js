import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FETCH_LIMIT,
  MAX_FETCH_PAGES,
  STATUS_OPTIONS,
  fetchAllSessions,
  isStatus,
  matchesStatus,
  pageOf,
} from '../src/features/attendance/services/session-status-filter.js';
import { useLecturerSessions } from '../src/features/attendance/composables/use-lecturer-sessions.js';

const session = (id, availability, classId = 1) => ({
  id,
  availability,
  class: {
    id: classId,
    course: { code: 'COS30043', name: 'Interface Design' },
    section: 'A',
  },
  starts_at: `2026-03-${String(id).padStart(2, '0')}T01:00:00.000Z`,
});

// A fake list endpoint over `all`, with the API's paging. It records calls.
function fakeService(all) {
  const calls = [];
  return {
    calls,
    async listMyClassSessions(params) {
      calls.push(params);
      const limit = params.limit ?? 20;
      const page = params.page ?? 1;
      return {
        data: all.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: all.length,
          totalPages: Math.max(1, Math.ceil(all.length / limit)),
        },
      };
    },
  };
}

test('the status options are All and the four availabilities', () => {
  assert.deepEqual(
    STATUS_OPTIONS.map((option) => option.value),
    ['', 'upcoming', 'in_progress', 'ended', 'cancelled'],
  );
  assert.equal(STATUS_OPTIONS[0].label, 'All statuses');
  assert.equal(isStatus('ended'), true);
  for (const bad of ['', 'finalised', 'ENDED', null, undefined, 3])
    assert.equal(isStatus(bad), false, String(bad));
});

test('a session matches when no status is chosen or its availability is it', () => {
  assert.equal(matchesStatus(session(1, 'ended'), ''), true);
  assert.equal(matchesStatus(session(1, 'ended'), 'ended'), true);
  assert.equal(matchesStatus(session(1, 'ended'), 'upcoming'), false);
  // An unknown status is treated as no filter.
  assert.equal(matchesStatus(session(1, 'ended'), 'nonsense'), true);
});

test('rows are cut into pages with the same meta as the API', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i + 1);
  const second = pageOf(rows, 2, 20);
  assert.deepEqual(second.data, rows.slice(20, 40));
  assert.deepEqual(second.meta, {
    page: 2,
    limit: 20,
    total: 45,
    totalPages: 3,
  });
  assert.deepEqual(pageOf(rows, 3, 20).data, [41, 42, 43, 44, 45]);
  // A page past the end becomes the last page; no rows is one empty page.
  assert.equal(pageOf(rows, 9, 20).meta.page, 3);
  assert.deepEqual(pageOf([], 4, 20), {
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
});

test('every page of sessions is fetched for the other filters', async () => {
  const all = Array.from({ length: 230 }, (_, i) => session(i + 1, 'ended'));
  const service = fakeService(all);
  const rows = await fetchAllSessions(service, { classId: 5 });
  assert.equal(rows.length, 230);
  assert.equal(FETCH_LIMIT, 100);
  assert.deepEqual(
    service.calls.map((call) => [call.page, call.limit, call.classId]),
    [
      [1, 100, 5],
      [2, 100, 5],
      [3, 100, 5],
    ],
  );
});

test('too many pages stop with a message to narrow the filters', async () => {
  const service = {
    async listMyClassSessions() {
      return { data: [], meta: { page: 1, limit: 100, totalPages: 21 } };
    },
  };
  assert.equal(MAX_FETCH_PAGES, 20);
  await assert.rejects(
    () => fetchAllSessions(service, {}),
    (error) =>
      error instanceof RangeError &&
      /Choose a class or a date range/.test(error.message),
  );
});

const mixed = () => [
  session(1, 'ended'),
  session(2, 'upcoming'),
  session(3, 'in_progress'),
  session(4, 'ended'),
  session(5, 'cancelled'),
  session(6, 'ended'),
];

test('without a status the list is paged by the server, as before', async () => {
  const service = fakeService(mixed());
  const lecturer = useLecturerSessions({ service });
  await lecturer.load();
  assert.equal(service.calls.length, 1);
  assert.deepEqual(service.calls[0], { page: 1, limit: 20 });
  assert.equal(lecturer.sessions.value.length, 6);
});

test('a status keeps only the sessions with that status', async () => {
  const service = fakeService(mixed());
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  assert.deepEqual(
    lecturer.sessions.value.map((item) => item.id),
    [1, 4, 6],
  );
  assert.equal(lecturer.meta.value.total, 3);
  assert.equal(lecturer.error.value, null);
  // The other filters still go to the server, with every page asked for.
  assert.deepEqual(service.calls[0], { page: 1, limit: 100 });
});

test('the status works together with the class and date filters', async () => {
  const service = fakeService(mixed());
  const lecturer = useLecturerSessions({ service });
  Object.assign(lecturer.filters, {
    classId: '7',
    from: '2026-03-01',
    to: '2026-03-31',
    status: 'upcoming',
  });
  await lecturer.applyFilters();
  const call = service.calls[0];
  assert.equal(call.classId, 7);
  assert.match(call.from, /^2026-03-01T00:00:00\+08:00$/);
  assert.match(call.to, /^2026-04-01T00:00:00\+08:00$/);
  assert.equal(call.limit, 100);
  assert.deepEqual(
    lecturer.sessions.value.map((item) => item.id),
    [2],
  );
});

test('a status with no matching session gives an empty list, not an error', async () => {
  const service = fakeService([session(1, 'ended'), session(2, 'ended')]);
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'in_progress';
  await lecturer.applyFilters();
  assert.deepEqual(lecturer.sessions.value, []);
  assert.equal(lecturer.error.value, null);
  assert.equal(lecturer.meta.value.total, 0);
  assert.equal(lecturer.meta.value.totalPages, 1);
});

test('a filtered list is paged here, 20 at a time', async () => {
  const all = Array.from({ length: 50 }, (_, i) =>
    session(i + 1, i % 2 === 0 ? 'ended' : 'upcoming'),
  );
  const service = fakeService(all);
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  assert.equal(lecturer.meta.value.total, 25);
  assert.equal(lecturer.meta.value.totalPages, 2);
  assert.equal(lecturer.sessions.value.length, 20);
  await lecturer.setPage(2);
  assert.equal(lecturer.page.value, 2);
  assert.equal(lecturer.sessions.value.length, 5);
  assert.ok(
    lecturer.sessions.value.every((item) => item.availability === 'ended'),
  );
});

test('changing the filters starts again from the first page', async () => {
  const all = Array.from({ length: 50 }, (_, i) => session(i + 1, 'ended'));
  const lecturer = useLecturerSessions({ service: fakeService(all) });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  await lecturer.setPage(3);
  assert.equal(lecturer.page.value, 3);
  lecturer.filters.status = 'upcoming';
  await lecturer.applyFilters();
  assert.equal(lecturer.page.value, 1);
});

test('the class list comes from every session when a status is chosen', async () => {
  const all = [
    session(1, 'ended', 1),
    session(2, 'upcoming', 2),
    session(3, 'ended', 3),
  ];
  const lecturer = useLecturerSessions({ service: fakeService(all) });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  assert.deepEqual(
    lecturer.classOptions.value.map((option) => option.value),
    ['1', '2', '3'],
  );
});

test('Clear removes the status too', async () => {
  const service = fakeService(mixed());
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  await lecturer.clearFilters();
  assert.equal(lecturer.filters.status, '');
  assert.equal(lecturer.sessions.value.length, 6);
  assert.deepEqual(service.calls.at(-1), { page: 1, limit: 20 });
});

test('too many sessions to filter shows an error with the reason', async () => {
  const service = {
    async listMyClassSessions() {
      return { data: [], meta: { page: 1, limit: 100, totalPages: 25 } };
    },
  };
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  assert.match(lecturer.error.value.message, /Choose a class or a date range/);
  assert.deepEqual(lecturer.sessions.value, []);
});

test('a failure while loading the pages is reported', async () => {
  const service = {
    async listMyClassSessions() {
      throw new Error('Offline');
    },
  };
  const lecturer = useLecturerSessions({ service });
  lecturer.filters.status = 'ended';
  await lecturer.applyFilters();
  assert.equal(lecturer.error.value.message, 'Offline');
  assert.deepEqual(lecturer.sessions.value, []);
});
