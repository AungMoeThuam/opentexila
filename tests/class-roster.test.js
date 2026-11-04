import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClassRosterService } from '../src/features/enrolments/services/class-roster-service.js';

const payload = {
  data: [],
  context: { class: { id: 1 } },
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

function serviceWith(response) {
  const calls = [];
  const service = createClassRosterService({
    api: {
      request: async (path, options) => {
        calls.push({ path, options });
        return response;
      },
    },
  });
  return { service, calls };
}

test('class roster service requests the enrolments path with page, limit and signal', async () => {
  const { service, calls } = serviceWith(payload);
  const controller = new AbortController();
  const result = await service.listClassRoster(
    '1',
    { page: 2, limit: 20 },
    { signal: controller.signal },
  );
  assert.deepEqual(calls, [
    {
      path: '/classes/1/enrolments?page=2&limit=20',
      options: { signal: controller.signal },
    },
  ]);
  assert.equal(result, payload);
});

test('class roster service omits blank params', async () => {
  const { service, calls } = serviceWith(payload);
  await service.listClassRoster(7);
  assert.equal(calls[0].path, '/classes/7/enrolments');
});

test('class roster service rejects bad ids and paging before calling the api', async () => {
  const { service, calls } = serviceWith(payload);
  for (const id of [0, -1, 1.5, 'abc', '1e3', ' 3', '', null, undefined]) {
    await assert.rejects(() => service.listClassRoster(id), RangeError);
  }
  for (const params of [
    { page: 0 },
    { page: 1.5 },
    { limit: 0 },
    { limit: 101 },
  ]) {
    await assert.rejects(() => service.listClassRoster(1, params), RangeError);
  }
  assert.equal(calls.length, 0);
});

test('class roster service rejects malformed payloads', async () => {
  for (const bad of [
    null,
    [],
    {},
    { data: {}, context: {}, meta: {} },
    { data: [], meta: {} },
    { data: [], context: {} },
  ]) {
    const { service } = serviceWith(bad);
    await assert.rejects(
      () => service.listClassRoster(1),
      (error) => error.code === 'INVALID_RESPONSE',
    );
  }
});
