import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentClassesService } from '../src/features/enrolments/services/student-classes-service.js';

const validPayload = {
  data: [
    {
      id: 1,
      course: { id: 101, code: 'COS30043', name: 'Interface Design' },
      section: 'A',
      term: '2026-S2',
      lecturer: { id: 2, name: 'Lecturer Demo' },
      room_label: 'EN402',
    },
  ],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

function serviceWith(response) {
  const calls = [];
  const service = createStudentClassesService({
    api: {
      request: async (path, options) => {
        calls.push({ path, options });
        return response;
      },
    },
  });
  return { service, calls };
}

test('student classes service requests /me/classes with query and signal', async () => {
  const { service, calls } = serviceWith(validPayload);
  const controller = new AbortController();

  const result = await service.listEnrolledClasses(
    { page: 2, limit: 10, term: '2026-S2' },
    { signal: controller.signal },
  );

  assert.deepEqual(calls, [
    {
      path: '/me/classes?page=2&limit=10&term=2026-S2',
      options: { signal: controller.signal },
    },
  ]);
  assert.equal(result, validPayload);
});

test('student classes service rejects malformed payloads', async () => {
  for (const bad of [
    null,
    undefined,
    [],
    {},
    { data: {} },
    { data: [], meta: null },
    { data: null, meta: {} },
  ]) {
    const { service } = serviceWith(bad);
    await assert.rejects(
      () => service.listEnrolledClasses(),
      (error) => error.code === 'INVALID_RESPONSE',
    );
  }
});
