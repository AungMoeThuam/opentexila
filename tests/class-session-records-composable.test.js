import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { ApiError } from '../src/shared/services/api-client.js';
import { useClassSessionRecords } from '../src/features/attendance/composables/use-class-session-records.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const CONTEXT = { session: { id: 7, state: 'scheduled' }, class: { id: 1 } };
const OTHER_CONTEXT = { session: { id: 8, state: 'open' }, class: { id: 2 } };

const recordFor = (id, status = 'present') => ({
  id,
  status,
  student: { id: id * 10, name: `Student ${id}` },
});

const pageOf = (data, { totalPages = 1, context = CONTEXT } = {}) => ({
  data,
  context,
  meta: { page: 1, limit: 20, total: data.length, totalPages },
});

function fakeService(handler = async () => pageOf([])) {
  const calls = [];
  return {
    calls,
    listClassSessionRecords(classSessionId, params, options) {
      calls.push({ classSessionId, params, signal: options.signal });
      return handler(classSessionId, params, options, calls.length);
    },
  };
}

test('success sets records, context and meta and clears loading', async () => {
  const data = [recordFor(1), recordFor(2, 'late')];
  const meta = { page: 1, limit: 20, total: 2, totalPages: 1 };
  const service = fakeService(async () => ({ data, context: CONTEXT, meta }));
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  await roster.load();

  assert.equal(service.calls[0].classSessionId, 7);
  assert.deepEqual(service.calls[0].params, {
    page: 1,
    limit: 20,
    status: '',
  });
  assert.deepEqual(roster.records.value, data);
  assert.deepEqual(roster.context.value, CONTEXT);
  assert.deepEqual(roster.meta.value, meta);
  assert.equal(roster.loading.value, false);
  assert.equal(roster.error.value, null);
  assert.equal(roster.notFound.value, false);
});

test('the id is read from a ref on every load', async () => {
  const service = fakeService(async () => pageOf([]));
  const id = ref(7);
  const roster = useClassSessionRecords({ service, classSessionId: id });

  await roster.load();
  id.value = 8;
  await roster.load();

  assert.equal(service.calls[0].classSessionId, 7);
  assert.equal(service.calls[1].classSessionId, 8);
});

test('the id is read from a getter on every load', async () => {
  const service = fakeService(async () => pageOf([]));
  let current = 3;
  const roster = useClassSessionRecords({
    service,
    classSessionId: () => current,
  });

  await roster.load();
  current = 4;
  await roster.load();

  assert.equal(service.calls[0].classSessionId, 3);
  assert.equal(service.calls[1].classSessionId, 4);
});

test('setStatus resets the page to 1, sends the status and ignores invalid values', async () => {
  const service = fakeService(async () => pageOf([], { totalPages: 3 }));
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  await roster.load();
  await roster.setPage(2);
  assert.equal(roster.page.value, 2);

  await roster.setStatus('late');
  assert.equal(roster.page.value, 1);
  assert.equal(roster.status.value, 'late');
  assert.deepEqual(service.calls.at(-1).params, {
    page: 1,
    limit: 20,
    status: 'late',
  });

  const before = service.calls.length;
  assert.equal(roster.setStatus('bogus'), undefined);
  assert.equal(roster.setStatus('PRESENT'), undefined);
  assert.equal(roster.setStatus(null), undefined);
  assert.equal(service.calls.length, before);
  assert.equal(roster.status.value, 'late');

  await roster.setStatus('');
  assert.equal(roster.status.value, '');
  assert.equal(service.calls.at(-1).params.status, '');
});

test('setPage accepts only integers within the known page range', async () => {
  const service = fakeService(async () => pageOf([], { totalPages: 3 }));
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  await roster.setPage(1);
  assert.equal(service.calls.length, 0);

  await roster.load();
  for (const invalid of [0, 4, 1.5, '2', NaN]) {
    roster.setPage(invalid);
  }
  assert.equal(service.calls.length, 1);
  assert.equal(roster.page.value, 1);

  await roster.setPage(3);
  assert.equal(roster.page.value, 3);
  assert.equal(service.calls.at(-1).params.page, 3);
});

test('an error empties records and meta but keeps the previous context', async () => {
  let fail = false;
  const service = fakeService(async () => {
    if (fail) throw new ApiError('Server down', { status: 500, code: 'X' });
    return pageOf([recordFor(1)]);
  });
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  await roster.load();

  fail = true;
  const failure = roster.load();
  assert.equal(roster.loading.value, true);
  assert.equal(roster.error.value, null);
  await failure;

  assert.ok(roster.error.value instanceof ApiError);
  assert.equal(roster.error.value.message, 'Server down');
  assert.deepEqual(roster.records.value, []);
  assert.equal(roster.meta.value, null);
  assert.deepEqual(roster.context.value, CONTEXT);
  assert.equal(roster.notFound.value, false);
  assert.equal(roster.loading.value, false);
});

test('a 404 ApiError sets notFound and clears context', async () => {
  const service = fakeService(async () => {
    throw new ApiError('Not found', {
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    });
  });
  const roster = useClassSessionRecords({ service, classSessionId: 99 });
  roster.context.value = CONTEXT;

  await roster.load();

  assert.equal(roster.notFound.value, true);
  assert.equal(roster.context.value, null);
  assert.deepEqual(roster.records.value, []);
});

test('a RESOURCE_NOT_FOUND code without a 404 status also sets notFound', async () => {
  const service = fakeService(async () => {
    throw new ApiError('Missing', { status: 410, code: 'RESOURCE_NOT_FOUND' });
  });
  const roster = useClassSessionRecords({ service, classSessionId: 99 });

  await roster.load();

  assert.equal(roster.notFound.value, true);
});

test('a 403 ApiError is an error but not notFound', async () => {
  const service = fakeService(async () => {
    throw new ApiError('Forbidden', { status: 403, code: 'FORBIDDEN' });
  });
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  roster.context.value = CONTEXT;

  await roster.load();

  assert.equal(roster.error.value.code, 'FORBIDDEN');
  assert.equal(roster.notFound.value, false);
  assert.deepEqual(roster.context.value, CONTEXT);
});

test('a RangeError from the service counts as notFound', async () => {
  const service = fakeService(async () => {
    throw new RangeError('Class session id must be a positive integer.');
  });
  const roster = useClassSessionRecords({ service, classSessionId: 'abc' });
  roster.context.value = CONTEXT;

  await roster.load();

  assert.ok(roster.error.value instanceof RangeError);
  assert.equal(roster.notFound.value, true);
  assert.equal(roster.context.value, null);
});

test('a synchronous RangeError from the service is stored as an error', async () => {
  const service = {
    listClassSessionRecords() {
      throw new RangeError('Invalid status.');
    },
  };
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  await roster.load();

  assert.ok(roster.error.value instanceof RangeError);
  assert.equal(roster.loading.value, false);
});

test('empty data still sets context from the response', async () => {
  const service = fakeService(async () => pageOf([]));
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  await roster.load();

  assert.deepEqual(roster.records.value, []);
  assert.deepEqual(roster.context.value, CONTEXT);
  assert.equal(roster.error.value, null);
});

test('a stale response is ignored', async () => {
  const first = deferred();
  const second = deferred();
  const service = fakeService((classSessionId, params, options, count) =>
    count === 1 ? first.promise : second.promise,
  );
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  const firstLoad = roster.load();
  const secondLoad = roster.load();

  const newest = [recordFor(2)];
  second.resolve(pageOf(newest, { context: OTHER_CONTEXT }));
  await secondLoad;
  first.resolve(pageOf([recordFor(1)]));
  await firstLoad;

  assert.deepEqual(roster.records.value, newest);
  assert.deepEqual(roster.context.value, OTHER_CONTEXT);
  assert.equal(roster.loading.value, false);
});

test('a new load aborts the previous request signal', async () => {
  const first = deferred();
  const service = fakeService((classSessionId, params, options, count) =>
    count === 1 ? first.promise : pageOf([]),
  );
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  const firstLoad = roster.load();
  assert.equal(service.calls[0].signal.aborted, false);

  await roster.load();
  assert.equal(service.calls[0].signal.aborted, true);
  assert.equal(service.calls[1].signal.aborted, false);

  first.resolve(pageOf([recordFor(1)]));
  await firstLoad;
  assert.deepEqual(roster.records.value, []);
});

test('an AbortError is ignored and does not set error', async () => {
  const service = fakeService(
    async (classSessionId, params, options, count) => {
      if (count === 1)
        throw new DOMException('Request cancelled', 'AbortError');
      return pageOf([recordFor(1)]);
    },
  );
  const roster = useClassSessionRecords({ service, classSessionId: 7 });

  await roster.load();

  assert.equal(roster.error.value, null);
  assert.equal(roster.loading.value, false);
  assert.deepEqual(roster.records.value, []);
});

test('reset aborts in-flight work and returns to the initial state without loading', async () => {
  const pending = deferred();
  const service = fakeService(() => pending.promise);
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  roster.context.value = CONTEXT;
  roster.status.value = 'absent';
  roster.page.value = 2;

  const inFlight = roster.load();
  assert.equal(roster.loading.value, true);

  roster.reset();

  assert.equal(service.calls[0].signal.aborted, true);
  assert.equal(service.calls.length, 1);
  assert.deepEqual(roster.records.value, []);
  assert.equal(roster.context.value, null);
  assert.equal(roster.meta.value, null);
  assert.equal(roster.status.value, '');
  assert.equal(roster.page.value, 1);
  assert.equal(roster.loading.value, false);
  assert.equal(roster.error.value, null);

  pending.resolve(pageOf([recordFor(1)]));
  await inFlight;
  assert.deepEqual(roster.records.value, []);
  assert.equal(roster.context.value, null);
  assert.equal(roster.loading.value, false);
});

test('reset clears an error', async () => {
  const service = fakeService(async () => {
    throw new ApiError('Not found', {
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    });
  });
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  await roster.load();
  assert.equal(roster.notFound.value, true);

  roster.reset();

  assert.equal(roster.error.value, null);
  assert.equal(roster.notFound.value, false);
});

test('retry reloads after an error', async () => {
  let fail = true;
  const service = fakeService(async () => {
    if (fail) throw new ApiError('Server down', { status: 500, code: 'X' });
    return pageOf([recordFor(1)]);
  });
  const roster = useClassSessionRecords({ service, classSessionId: 7 });
  await roster.load();
  assert.ok(roster.error.value instanceof ApiError);

  fail = false;
  await roster.retry();

  assert.equal(service.calls.length, 2);
  assert.equal(roster.error.value, null);
  assert.deepEqual(roster.records.value, [recordFor(1)]);
});
