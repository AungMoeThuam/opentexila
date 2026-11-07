import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMyClassesService } from '../src/features/enrolments/services/my-classes-service.js';
import { createStudentClassesService } from '../src/features/enrolments/services/student-classes-service.js';

for (const [role, create, method] of [
  ['student', createStudentClassesService, 'listEnrolledClasses'],
  ['lecturer', createMyClassesService, 'list'],
]) {
  test(`${role} class-list service follows the shared API contract`, async (t) => {
    const payload = {
      data: [],
      meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
    };
    await t.test(
      'forwards allowed filters and signal, returning empty results unchanged',
      async () => {
        const signal = new AbortController().signal;
        let call;
        const service = create({
          api: {
            request: async (...args) => {
              call = args;
              return payload;
            },
          },
        });
        const result = await service[method](
          { page: 2, limit: 10, courseId: 101, term: '2026-S2', userId: 999 },
          { signal },
        );
        assert.deepEqual(call, [
          '/me/classes?page=2&limit=10&courseId=101&term=2026-S2',
          { signal },
        ]);
        assert.equal(result, payload);
      },
    );
    await t.test('rejects malformed responses', async () => {
      for (const bad of [
        null,
        undefined,
        [],
        {},
        { data: {} },
        { data: [], meta: null },
        { data: null, meta: {} },
        { data: [], meta: [] },
        { data: [], meta: { totalPages: -1 } },
        { data: [], meta: { totalPages: '1' } },
      ]) {
        const service = create({ api: { request: async () => bad } });
        await assert.rejects(service[method](), { code: 'INVALID_RESPONSE' });
      }
    });
    await t.test('does not request invalid filters', async () => {
      let calls = 0;
      const service = create({
        api: {
          request: async () => {
            calls++;
            return payload;
          },
        },
      });
      await assert.rejects(service[method]({ page: -1 }), RangeError);
      assert.equal(calls, 0);
    });
    await t.test('preserves API and cancellation errors', async () => {
      for (const cause of [
        new Error('offline'),
        new DOMException('aborted', 'AbortError'),
      ]) {
        const service = create({
          api: {
            request: async () => {
              throw cause;
            },
          },
        });
        await assert.rejects(service[method](), (error) => error === cause);
      }
    });
  });
}
