import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { buildClassSessionsPath } from '../src/features/attendance/services/class-session-query.js';
import { createClassSessionsService } from '../src/features/attendance/services/class-sessions-service.js';

test('class sessions path is bare without params', () => {
  assert.equal(buildClassSessionsPath(), '/me/class-sessions');
  assert.equal(buildClassSessionsPath({}), '/me/class-sessions');
});

test('class sessions path omits undefined, null and blank values', () => {
  assert.equal(
    buildClassSessionsPath({
      page: undefined,
      limit: null,
      classId: '',
      from: '   ',
      to: null,
    }),
    '/me/class-sessions',
  );
  assert.equal(
    buildClassSessionsPath({ page: 2, classId: undefined }),
    '/me/class-sessions?page=2',
  );
});

test('class sessions path keeps full param order and emits ISO UTC dates', () => {
  assert.equal(
    buildClassSessionsPath({
      to: '2026-03-01T10:00:00+08:00',
      from: new Date('2026-02-01T00:00:00Z'),
      classId: 1,
      limit: 20,
      page: 2,
    }),
    '/me/class-sessions?page=2&limit=20&classId=1&from=2026-02-01T00%3A00%3A00.000Z&to=2026-03-01T02%3A00%3A00.000Z',
  );
});

test('class sessions path rejects invalid pagination and class ids', () => {
  for (const params of [
    { page: 0 },
    { page: 10001 },
    { page: 1.5 },
    { page: 'two' },
    { limit: 0 },
    { limit: 101 },
    { limit: -1 },
    { classId: 0 },
    { classId: -3 },
    { classId: 2.5 },
    { classId: 'abc' },
  ]) {
    assert.throws(() => buildClassSessionsPath(params), RangeError);
  }
  assert.equal(
    buildClassSessionsPath({ page: 10000, limit: 100 }),
    '/me/class-sessions?page=10000&limit=100',
  );
});

test('class sessions path rejects invalid dates and reversed ranges', () => {
  assert.throws(
    () => buildClassSessionsPath({ from: 'not a date' }),
    RangeError,
  );
  assert.throws(
    () => buildClassSessionsPath({ to: new Date('invalid') }),
    RangeError,
  );
  assert.throws(
    () =>
      buildClassSessionsPath({
        from: '2026-03-01T00:00:00Z',
        to: '2026-02-01T00:00:00Z',
      }),
    RangeError,
  );
  assert.throws(
    () =>
      buildClassSessionsPath({
        from: '2026-03-01T00:00:00Z',
        to: '2026-03-01T00:00:00Z',
      }),
    RangeError,
  );
  assert.equal(
    buildClassSessionsPath({ from: '2026-03-01T00:00:00Z' }),
    '/me/class-sessions?from=2026-03-01T00%3A00%3A00.000Z',
  );
});

test('class sessions service requests the built path with the abort signal', async () => {
  const calls = [];
  const payload = { data: [{ id: 7 }], meta: { page: 1, limit: 20 } };
  const service = createClassSessionsService({
    api: {
      request: async (path, options) => {
        calls.push({ path, options });
        return payload;
      },
    },
  });
  const controller = new AbortController();
  const result = await service.listMyClassSessions(
    { page: 1, limit: 20 },
    { signal: controller.signal },
  );
  assert.deepEqual(calls, [
    {
      path: '/me/class-sessions?page=1&limit=20',
      options: { signal: controller.signal },
    },
  ]);
  assert.equal(result, payload);
});

test('class sessions service rejects malformed payloads as INVALID_RESPONSE', async () => {
  for (const response of [
    null,
    [],
    { meta: {} },
    { data: {}, meta: {} },
    { data: [] },
    { data: [], meta: [] },
  ]) {
    const service = createClassSessionsService({
      api: { request: async () => response },
    });
    await assert.rejects(
      service.listMyClassSessions(),
      (error) =>
        error instanceof ApiError &&
        error.code === 'INVALID_RESPONSE' &&
        error.message === 'The server returned an unexpected response.',
    );
  }
});

test('class sessions service propagates ApiError from the api client', async () => {
  const failure = new ApiError('Forbidden.', {
    status: 403,
    code: 'FORBIDDEN',
  });
  const service = createClassSessionsService({
    api: {
      request: async () => {
        throw failure;
      },
    },
  });
  await assert.rejects(
    service.listMyClassSessions(),
    (error) => error === failure,
  );
});
