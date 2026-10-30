import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { toQueryParams } from '../src/features/attendance/services/filter-params.js';
import { useLecturerSessions } from '../src/features/attendance/composables/use-lecturer-sessions.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const classRecord = (id, code, name, section = 'A') => ({
  id,
  course: { id: id * 100, code, name },
  section,
  term: '2026-S2',
  lecturer: { id: 2, name: 'Lecturer Demo' },
  room_label: 'EN402',
});

const sessionFor = (id, cls) => ({
  id,
  class_id: cls.id,
  class: cls,
  starts_at: '2026-03-02T01:00:00.000Z',
  late_after: '2026-03-02T01:15:00.000Z',
  ends_at: '2026-03-02T03:00:00.000Z',
  state: 'scheduled',
  availability: 'upcoming',
  my_attendance: null,
});

const CLASS_1 = classRecord(1, 'COS30043', 'Interface Design and Development');
const CLASS_2 = classRecord(
  2,
  'SWE30003',
  'Software Architectures and Design',
  'B',
);
const CLASS_3 = classRecord(
  3,
  'COS20031',
  'Computing Technology Inquiry Project',
);

const pageOf = (data, totalPages = 1) => ({
  data,
  meta: { page: 1, limit: 20, total: data.length, totalPages },
});

function fakeService(handler = async () => pageOf([])) {
  const calls = [];
  return {
    calls,
    listMyClassSessions(params, options) {
      calls.push({ params, signal: options.signal });
      return handler(params, options, calls.length);
    },
  };
}

test('toQueryParams converts UI filters to Malaysian day boundaries', () => {
  assert.deepEqual(
    toQueryParams({
      classId: '3',
      from: '2026-03-01',
      to: '2026-03-07',
      page: 2,
      limit: 20,
    }),
    {
      classId: 3,
      from: '2026-03-01T00:00:00+08:00',
      to: '2026-03-08T00:00:00+08:00',
      page: 2,
      limit: 20,
    },
  );
});

test('toQueryParams makes the end date inclusive across month, year and leap day', () => {
  assert.equal(
    toQueryParams({ to: '2026-01-31' }).to,
    '2026-02-01T00:00:00+08:00',
  );
  assert.equal(
    toQueryParams({ to: '2026-12-31' }).to,
    '2027-01-01T00:00:00+08:00',
  );
  assert.equal(
    toQueryParams({ to: '2028-02-28' }).to,
    '2028-02-29T00:00:00+08:00',
  );
  assert.equal(
    toQueryParams({ to: '2028-02-29' }).to,
    '2028-03-01T00:00:00+08:00',
  );
});

test('toQueryParams omits empty values', () => {
  assert.deepEqual(toQueryParams({ classId: '', from: '', to: '' }), {});
  assert.deepEqual(toQueryParams(), {});
});

test('toQueryParams rejects a start date after the end date', () => {
  assert.throws(() => toQueryParams({ from: '2026-03-10', to: '2026-03-09' }), {
    name: 'RangeError',
    message: 'Start date must be on or before end date.',
  });
});

test('toQueryParams rejects malformed and impossible dates', () => {
  for (const value of [
    '2026-1-5',
    'abc',
    '2026/03/05',
    '2026-02-30',
    '2026-13-01',
  ]) {
    assert.throws(() => toQueryParams({ from: value }), RangeError);
    assert.throws(() => toQueryParams({ to: value }), RangeError);
  }
});

test('load success sets sessions and meta and clears loading', async () => {
  const data = [sessionFor(1, CLASS_1)];
  const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
  const service = fakeService(async () => ({ data, meta }));
  const lecturer = useLecturerSessions({ service });

  await lecturer.load();

  assert.deepEqual(service.calls[0].params, { page: 1, limit: 20 });
  assert.deepEqual(lecturer.sessions.value, data);
  assert.deepEqual(lecturer.meta.value, meta);
  assert.equal(lecturer.loading.value, false);
  assert.equal(lecturer.error.value, null);
});

test('load error keeps the ApiError and empties previous data', async () => {
  let fail = false;
  const service = fakeService(async () => {
    if (fail) throw new ApiError('Server down', { status: 500, code: 'X' });
    return pageOf([sessionFor(1, CLASS_1)]);
  });
  const lecturer = useLecturerSessions({ service });
  await lecturer.load();

  fail = true;
  const failure = lecturer.load();
  assert.equal(lecturer.loading.value, true);
  await failure;

  assert.ok(lecturer.error.value instanceof ApiError);
  assert.equal(lecturer.error.value.message, 'Server down');
  assert.deepEqual(lecturer.sessions.value, []);
  assert.equal(lecturer.meta.value, null);
  assert.equal(lecturer.loading.value, false);

  fail = false;
  await lecturer.retry();
  assert.equal(lecturer.error.value, null);
  assert.equal(service.calls.length, 3);
});

test('applyFilters resets the page to 1 and sends converted params', async () => {
  const service = fakeService(async () => pageOf([], 3));
  const lecturer = useLecturerSessions({ service, limit: 10 });
  await lecturer.load();
  await lecturer.setPage(2);
  assert.equal(lecturer.page.value, 2);

  Object.assign(lecturer.filters, {
    classId: '3',
    from: '2026-03-01',
    to: '2026-03-07',
  });
  await lecturer.applyFilters();

  assert.equal(lecturer.page.value, 1);
  assert.deepEqual(service.calls.at(-1).params, {
    classId: 3,
    from: '2026-03-01T00:00:00+08:00',
    to: '2026-03-08T00:00:00+08:00',
    page: 1,
    limit: 10,
  });
});

test('an invalid date range sets filterError and does not call the service', async () => {
  const service = fakeService(async () => pageOf([sessionFor(1, CLASS_1)]));
  const lecturer = useLecturerSessions({ service });
  await lecturer.load();
  const before = lecturer.sessions.value;

  Object.assign(lecturer.filters, { from: '2026-03-10', to: '2026-03-01' });
  await lecturer.applyFilters();

  assert.equal(
    lecturer.filterError.value,
    'Start date must be on or before end date.',
  );
  assert.equal(service.calls.length, 1);
  assert.equal(lecturer.sessions.value, before);

  lecturer.filters.to = '2026-03-12';
  await lecturer.load();
  assert.equal(lecturer.filterError.value, '');
  assert.equal(service.calls.length, 2);
});

test('clearFilters resets filters, page and filterError, then reloads', async () => {
  const service = fakeService(async () => pageOf([], 3));
  const lecturer = useLecturerSessions({ service });
  await lecturer.load();
  await lecturer.setPage(3);
  Object.assign(lecturer.filters, {
    classId: '1',
    from: '2026-03-10',
    to: '2026-03-01',
  });
  await lecturer.load();
  assert.notEqual(lecturer.filterError.value, '');

  await lecturer.clearFilters();

  assert.deepEqual({ ...lecturer.filters }, { classId: '', from: '', to: '' });
  assert.equal(lecturer.page.value, 1);
  assert.equal(lecturer.filterError.value, '');
  assert.deepEqual(service.calls.at(-1).params, { page: 1, limit: 20 });
});

test('setPage accepts only integers within the known page range', async () => {
  const service = fakeService(async () => pageOf([], 3));
  const lecturer = useLecturerSessions({ service });

  await lecturer.setPage(1);
  assert.equal(service.calls.length, 0);

  await lecturer.load();
  for (const invalid of [0, 4, 1.5, '2', NaN]) {
    await lecturer.setPage(invalid);
  }
  assert.equal(service.calls.length, 1);
  assert.equal(lecturer.page.value, 1);

  await lecturer.setPage(3);
  assert.equal(lecturer.page.value, 3);
  assert.equal(service.calls.at(-1).params.page, 3);
});

test('a stale response is ignored and earlier requests are aborted', async () => {
  const first = deferred();
  const second = deferred();
  const service = fakeService((params, options, count) =>
    count === 1 ? first.promise : second.promise,
  );
  const lecturer = useLecturerSessions({ service });

  const firstLoad = lecturer.load();
  const secondLoad = lecturer.load();
  assert.equal(service.calls[0].signal.aborted, true);
  assert.equal(service.calls[1].signal.aborted, false);

  const newest = [sessionFor(2, CLASS_2)];
  second.resolve(pageOf(newest));
  await secondLoad;
  first.resolve(pageOf([sessionFor(1, CLASS_1)]));
  await firstLoad;

  assert.deepEqual(lecturer.sessions.value, newest);
  assert.equal(lecturer.loading.value, false);
});

test('an aborted request does not set an error', async () => {
  const service = fakeService(async (params, options, count) => {
    if (count === 1) {
      const error = new DOMException('Request cancelled', 'AbortError');
      throw error;
    }
    return pageOf([sessionFor(1, CLASS_1)]);
  });
  const lecturer = useLecturerSessions({ service });

  await lecturer.load();
  assert.equal(lecturer.error.value, null);
  assert.equal(lecturer.loading.value, false);
});

test('classOptions accumulate across loads and stay after a class-filtered load', async () => {
  const service = fakeService(async (params) =>
    params.classId === 3
      ? pageOf([sessionFor(9, CLASS_3)])
      : pageOf([sessionFor(1, CLASS_1), sessionFor(2, CLASS_2)]),
  );
  const lecturer = useLecturerSessions({ service });

  await lecturer.load();
  lecturer.filters.classId = '3';
  await lecturer.applyFilters();

  assert.deepEqual(
    lecturer.classOptions.value.map((option) => option.value),
    ['3', '1', '2'],
  );
  assert.deepEqual(lecturer.classOptions.value[0], {
    value: '3',
    label: 'COS20031 Computing Technology Inquiry Project (Section A)',
  });
  assert.equal(
    lecturer.classOptions.value[2].label,
    'SWE30003 Software Architectures and Design (Section B)',
  );
});
