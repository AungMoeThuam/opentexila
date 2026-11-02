import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { buildClassSessionRecordsPath } from '../src/features/attendance/services/class-session-records-query.js';
import { createClassSessionRecordsService } from '../src/features/attendance/services/class-session-records-service.js';

test('class session records path is bare without params', () => {
  assert.equal(buildClassSessionRecordsPath(30), '/class-sessions/30/records');
  assert.equal(
    buildClassSessionRecordsPath(30, {}),
    '/class-sessions/30/records',
  );
});

test('class session records path keeps page, limit, status order', () => {
  assert.equal(
    buildClassSessionRecordsPath(30, { status: 'late', limit: 20, page: 2 }),
    '/class-sessions/30/records?page=2&limit=20&status=late',
  );
  assert.equal(
    buildClassSessionRecordsPath(30, { page: 2, limit: 20, status: 'absent' }),
    '/class-sessions/30/records?page=2&limit=20&status=absent',
  );
  assert.equal(
    buildClassSessionRecordsPath(7, { page: 10000, limit: 100 }),
    '/class-sessions/7/records?page=10000&limit=100',
  );
});

test('class session records path accepts digit-only string ids', () => {
  assert.equal(
    buildClassSessionRecordsPath('30', { status: 'pending' }),
    '/class-sessions/30/records?status=pending',
  );
  assert.equal(
    buildClassSessionRecordsPath('12'),
    '/class-sessions/12/records',
  );
});

test('class session records path omits undefined, null and blank values', () => {
  assert.equal(
    buildClassSessionRecordsPath(30, {
      page: undefined,
      limit: null,
      status: '',
    }),
    '/class-sessions/30/records',
  );
  assert.equal(
    buildClassSessionRecordsPath(30, { status: '   ', page: null }),
    '/class-sessions/30/records',
  );
  assert.equal(
    buildClassSessionRecordsPath(30, { status: null, limit: 5 }),
    '/class-sessions/30/records?limit=5',
  );
});

test('class session records path rejects invalid class session ids', () => {
  for (const id of [
    0,
    -1,
    1.5,
    NaN,
    '0',
    '',
    '1.5',
    '1e3',
    ' 3',
    '3 ',
    '-1',
    'abc',
    null,
    undefined,
    Number.MAX_SAFE_INTEGER + 2,
  ]) {
    assert.throws(
      () => buildClassSessionRecordsPath(id),
      RangeError,
      String(id),
    );
  }
});

test('class session records path rejects invalid status values', () => {
  for (const status of ['PRESENT', 'unknown', 'scheduled', 1, ['late']]) {
    assert.throws(
      () => buildClassSessionRecordsPath(30, { status }),
      RangeError,
    );
  }
});

test('class session records path rejects invalid pagination', () => {
  for (const params of [
    { page: 0 },
    { page: 10001 },
    { page: 1.5 },
    { page: 'two' },
    { limit: 0 },
    { limit: 101 },
    { limit: -1 },
    { limit: 2.5 },
  ]) {
    assert.throws(() => buildClassSessionRecordsPath(30, params), RangeError);
  }
});

test('class session records service requests the built path with the abort signal', async () => {
  const calls = [];
  const payload = {
    data: [],
    context: {},
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
  const service = createClassSessionRecordsService({
    api: {
      request: async (path, options) => {
        calls.push({ path, options });
        return payload;
      },
    },
  });
  const controller = new AbortController();
  const result = await service.listClassSessionRecords(
    30,
    { page: 1, limit: 20, status: 'late' },
    { signal: controller.signal },
  );
  assert.deepEqual(calls, [
    {
      path: '/class-sessions/30/records?page=1&limit=20&status=late',
      options: { signal: controller.signal },
    },
  ]);
  assert.equal(result, payload);
});

test('class session records service rejects bad ids before calling the api', async () => {
  let called = false;
  const service = createClassSessionRecordsService({
    api: {
      request: async () => {
        called = true;
        return {};
      },
    },
  });
  await assert.rejects(service.listClassSessionRecords('0'), RangeError);
  assert.equal(called, false);
});

test('class session records service rejects malformed payloads as INVALID_RESPONSE', async () => {
  const valid = {
    data: [],
    context: { class_session_id: 30 },
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
  for (const response of [
    null,
    [],
    { context: {}, meta: {} },
    { data: {}, context: {}, meta: {} },
    { data: [], meta: {} },
    { data: [], context: [], meta: {} },
    { data: [], context: {} },
    { data: [], context: {}, meta: [] },
    { ...valid, context: null },
    { ...valid, meta: null },
  ]) {
    const service = createClassSessionRecordsService({
      api: { request: async () => response },
    });
    await assert.rejects(
      service.listClassSessionRecords(30),
      (error) =>
        error instanceof ApiError &&
        error.code === 'INVALID_RESPONSE' &&
        error.message === 'The server returned an unexpected response.',
    );
  }
});

test('class session records service accepts a payload with empty data', async () => {
  const payload = {
    data: [],
    context: { class_session_id: 30 },
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
  const service = createClassSessionRecordsService({
    api: { request: async () => payload },
  });
  assert.equal(await service.listClassSessionRecords(30), payload);
});

test('class session records service propagates ApiError from the api client', async () => {
  const failure = new ApiError('This class session was not found.', {
    status: 404,
    code: 'RESOURCE_NOT_FOUND',
  });
  const service = createClassSessionRecordsService({
    api: {
      request: async () => {
        throw failure;
      },
    },
  });
  await assert.rejects(
    service.listClassSessionRecords(30),
    (error) => error === failure,
  );
});
