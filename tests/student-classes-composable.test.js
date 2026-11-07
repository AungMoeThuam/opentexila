import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { useStudentClasses } from '../src/features/enrolments/composables/use-student-classes.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const sampleClass = (id = 1, term = '2026-S2') => ({
  id,
  course: { id: 100 + id, code: `COS${10000 + id}`, name: `Course ${id}` },
  section: 'A',
  term,
  lecturer: { id: 2, name: 'Lecturer Demo' },
  room_label: 'EN402',
});

const pageOf = (data, { page = 1, totalPages = 1 } = {}) => ({
  data,
  meta: { page, limit: 20, total: data.length, totalPages },
});

function fakeService(handler = async () => pageOf([])) {
  const calls = [];
  return {
    calls,
    listEnrolledClasses(params, options) {
      calls.push({ params, signal: options?.signal });
      return handler(params, options, calls.length);
    },
  };
}

test('load populates classes, meta, and clears loading', async () => {
  const classes = [sampleClass(1), sampleClass(2)];
  const service = fakeService(async () => pageOf(classes));
  const composable = useStudentClasses({ service });

  await composable.load();

  assert.equal(service.calls.length, 1);
  assert.deepEqual(composable.classes.value, classes);
  assert.equal(composable.meta.value.total, 2);
  assert.equal(composable.loading.value, false);
  assert.equal(composable.error.value, null);
});

test('load handles empty response properly', async () => {
  const service = fakeService(async () => pageOf([]));
  const composable = useStudentClasses({ service });

  await composable.load();

  assert.deepEqual(composable.classes.value, []);
  assert.equal(composable.meta.value.total, 0);
  assert.equal(composable.loading.value, false);
  assert.equal(composable.error.value, null);
});

test('load records error on failure and supports retry', async () => {
  let fail = true;
  const service = fakeService(async () => {
    if (fail) throw new ApiError('Service unavailable', { status: 503 });
    return pageOf([sampleClass(1)]);
  });

  const composable = useStudentClasses({ service });
  await composable.load();

  assert.equal(composable.loading.value, false);
  assert.equal(composable.error.value.status, 503);
  assert.deepEqual(composable.classes.value, []);

  fail = false;
  await composable.retry();

  assert.equal(composable.loading.value, false);
  assert.equal(composable.error.value, null);
  assert.equal(composable.classes.value.length, 1);
});

test('setPage updates page and reloads, ignoring invalid pages', async () => {
  const service = fakeService(async (params) =>
    pageOf([sampleClass(params.page)], { page: params.page, totalPages: 3 }),
  );
  const composable = useStudentClasses({ service });

  await composable.load();
  assert.equal(composable.page.value, 1);

  await composable.setPage(3);
  assert.equal(composable.page.value, 3);
  assert.equal(service.calls.at(-1).params.page, 3);

  const callCount = service.calls.length;
  for (const bad of [0, 4, -1, 1.5, '2']) {
    await composable.setPage(bad);
  }
  assert.equal(service.calls.length, callCount);
});

test('setFilters handles both numeric and string courseId without exceptions', async () => {
  const service = fakeService(async (params) =>
    pageOf([sampleClass(1, params.term)], { page: params.page, totalPages: 1 }),
  );
  const composable = useStudentClasses({ service });

  // 1. Numeric courseId (e.g. from v-model.number) with term 2026-S2
  await composable.setFilters({ term: '2026-S2', courseId: 101 });
  assert.equal(composable.page.value, 1);
  assert.equal(composable.filters.term, '2026-S2');
  assert.equal(composable.filters.courseId, 101);
  assert.equal(service.calls.at(-1).params.term, '2026-S2');
  assert.equal(service.calls.at(-1).params.courseId, 101);
  assert.equal(composable.hasActiveFilters.value, true);

  // 2. String courseId with term 2026-S1
  await composable.setFilters({ term: '2026-S1', courseId: '102' });
  assert.equal(composable.filters.term, '2026-S1');
  assert.equal(composable.filters.courseId, '102');
  assert.equal(service.calls.at(-1).params.term, '2026-S1');
  assert.equal(service.calls.at(-1).params.courseId, '102');

  // 3. Clear/reset filters
  await composable.resetFilters();
  assert.equal(composable.filters.term, '');
  assert.equal(composable.filters.courseId, '');
  assert.equal(composable.hasActiveFilters.value, false);
});

test('stale responses from older requests are ignored', async () => {
  const first = deferred();
  const second = deferred();
  let count = 0;

  const service = fakeService(async () => {
    count += 1;
    if (count === 1) return first.promise;
    return second.promise;
  });

  const composable = useStudentClasses({ service });

  const firstCall = composable.load();
  const secondCall = composable.load();

  // Resolve second call first
  second.resolve(pageOf([sampleClass(2)]));
  await secondCall;

  assert.equal(composable.classes.value[0].id, 2);

  // Older first call finishes later
  first.resolve(pageOf([sampleClass(1)]));
  await firstCall;

  // State remains from the newer request
  assert.equal(composable.classes.value[0].id, 2);
});
