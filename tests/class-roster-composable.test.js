import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { ApiError } from '../src/shared/services/api-client.js';
import { useClassRoster } from '../src/features/enrolments/composables/use-class-roster.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const CONTEXT = { class: { id: 1 } };
const enrolmentFor = (id) => ({
  class_id: 1,
  student_id: id,
  student: { id, name: `Student ${id}`, email: `s${id}@example.com` },
});
const pageOf = (data, { page = 1, totalPages = 1 } = {}) => ({
  data,
  context: CONTEXT,
  meta: { page, limit: 20, total: data.length, totalPages },
});

function fakeService(handler = async () => pageOf([])) {
  const calls = [];
  return {
    calls,
    listClassRoster(classId, params, options) {
      calls.push({ classId, params, signal: options.signal });
      return handler(classId, params, options, calls.length);
    },
  };
}

test('load stores enrolments, context and meta and clears loading', async () => {
  const data = [enrolmentFor(1), enrolmentFor(2)];
  const service = fakeService(async () => pageOf(data));
  const roster = useClassRoster({ service, classId: 1 });

  await roster.load();

  assert.deepEqual(service.calls[0].params, { page: 1, limit: 20 });
  assert.deepEqual(roster.enrolments.value, data);
  assert.deepEqual(roster.context.value, CONTEXT);
  assert.equal(roster.meta.value.total, 2);
  assert.equal(roster.loading.value, false);
  assert.equal(roster.error.value, null);
});

test('a 404 sets notFound and drops the context', async () => {
  const service = fakeService(async () => {
    throw new ApiError('nope', { status: 404, code: 'RESOURCE_NOT_FOUND' });
  });
  const roster = useClassRoster({ service, classId: 99 });

  await roster.load();

  assert.equal(roster.notFound.value, true);
  assert.equal(roster.context.value, null);
  assert.deepEqual(roster.enrolments.value, []);
});

test('another error keeps the class header and is retryable', async () => {
  let fail = true;
  const service = fakeService(async (_id, params) => {
    if (fail) throw new ApiError('down', { status: 500 });
    return pageOf([enrolmentFor(1)], { page: params.page, totalPages: 2 });
  });
  const roster = useClassRoster({ service, classId: 1 });
  await roster.load();
  assert.equal(roster.error.value.status, 500);
  assert.equal(roster.notFound.value, false);

  fail = false;
  await roster.retry();
  assert.equal(roster.error.value, null);
  assert.equal(roster.enrolments.value.length, 1);
});

test('setPage loads the requested page and ignores out-of-range pages', async () => {
  const service = fakeService(async (_id, params) =>
    pageOf([enrolmentFor(params.page)], { page: params.page, totalPages: 3 }),
  );
  const roster = useClassRoster({ service, classId: 1 });
  await roster.load();

  await roster.setPage(3);
  assert.equal(service.calls.at(-1).params.page, 3);

  const before = service.calls.length;
  for (const bad of [0, 4, 1.5, '2']) await roster.setPage(bad);
  assert.equal(service.calls.length, before);
});

test('a stale response from an older request is ignored', async () => {
  const first = deferred();
  const second = deferred();
  const service = fakeService((_id, _params, _opts, n) =>
    n === 1 ? first.promise : second.promise,
  );
  const roster = useClassRoster({ service, classId: 1 });

  const a = roster.load();
  const b = roster.load();
  assert.equal(service.calls[0].signal.aborted, true);

  second.resolve(pageOf([enrolmentFor(2)]));
  await b;
  first.resolve(pageOf([enrolmentFor(1)]));
  await a;

  assert.equal(roster.enrolments.value[0].student_id, 2);
});

test('reset clears state, and classId may be a getter', async () => {
  const id = ref(1);
  const service = fakeService(async () => pageOf([enrolmentFor(1)]));
  const roster = useClassRoster({ service, classId: () => id.value });
  await roster.load();

  id.value = 2;
  roster.reset();
  assert.deepEqual(roster.enrolments.value, []);
  assert.equal(roster.context.value, null);

  await roster.load();
  assert.equal(service.calls.at(-1).classId, 2);
});
