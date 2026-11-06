import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMyClassesPath,
  createMyClassesService,
} from '../src/features/enrolments/services/my-classes-service.js';
import { createMockMyClassesService } from '../src/features/enrolments/services/mock-my-classes.js';
import { createMockClassRosterService } from '../src/features/enrolments/services/mock-class-roster.js';
import { useMyClasses } from '../src/features/enrolments/composables/use-my-classes.js';
import { navigationForRole } from '../src/layouts/navigation.js';
import routes from '../src/features/enrolments/routes.js';

test('class API uses only allowed filters and preserves cancellation', async () => {
  const signal = new AbortController().signal;
  let call;
  const service = createMyClassesService({
    api: {
      request: async (...args) => {
        call = args;
        return { data: [], meta: { totalPages: 0 } };
      },
    },
  });
  await service.list(
    { courseId: 101, term: '2026-S2', userId: 999 },
    { signal },
  );
  assert.equal(
    call[0],
    '/me/classes?page=1&limit=20&courseId=101&term=2026-S2',
  );
  assert.equal(call[1].signal, signal);
  for (const params of [
    { page: 0 },
    { limit: 101 },
    { courseId: '1e2' },
    { term: ' ' },
  ])
    assert.throws(() => buildMyClassesPath(params), RangeError);
  await assert.rejects(
    createMyClassesService({ api: { request: async () => ({}) } }).list(),
    { code: 'INVALID_RESPONSE' },
  );
});
test('mock class pagination, filters and roster links agree', async () => {
  const service = createMockMyClassesService();
  const result = await service.list({ page: 2, limit: 1 });
  assert.equal(result.data[0].id, 2);
  assert.equal(result.meta.totalPages, 3);
  assert.equal((await service.list({ courseId: 103 })).data[0].id, 3);
  assert.equal((await service.list({ term: 'missing' })).meta.totalPages, 0);
  for (const cls of (await service.list()).data) {
    const roster = await createMockClassRosterService().listClassRoster(cls.id);
    assert.deepEqual(roster.context.class, cls);
  }
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(service.list({}, { signal: abort.signal }), {
    name: 'AbortError',
  });
});
test('filters reset pagination and choices include classes beyond the displayed page', async () => {
  const state = useMyClasses({
    service: createMockMyClassesService(),
    limit: 1,
  });
  await state.load();
  assert.equal(state.courses.value.length, 3);
  await state.setPage(2);
  assert.equal(state.classes.value[0].id, 2);
  await state.applyFilters({ courseId: 103 });
  assert.equal(state.meta.value.page, 1);
  assert.equal(state.classes.value[0].id, 3);
  assert.equal(state.courses.value.length, 3);
  state.dispose();
});
test('obsolete responses cannot overwrite newer results; errors can be retried', async () => {
  let resolveOld,
    calls = 0;
  const mock = createMockMyClassesService();
  const state = useMyClasses({
    service: {
      list: (...args) =>
        ++calls === 1
          ? new Promise((resolve) => {
              resolveOld = resolve;
            })
          : mock.list(...args),
    },
  });
  const old = state.load();
  await state.applyFilters({ courseId: 102 });
  resolveOld(await mock.list({ courseId: 101 }));
  await old;
  assert.equal(state.classes.value[0].id, 2);
  let fail = true;
  const retry = useMyClasses({
    service: {
      list: (...args) => {
        if (fail) throw new Error('Unavailable');
        return mock.list(...args);
      },
    },
  });
  await retry.load();
  assert.equal(retry.error.value.message, 'Unavailable');
  fail = false;
  await retry.load();
  assert.equal(retry.error.value, null);
  assert.equal(retry.classes.value.length, 3);
});
test('assigned classes navigation and route are lecturer-only', () => {
  assert.deepEqual(
    routes.find((r) => r.name === 'lecturer-classes').meta.roles,
    ['teacher'],
  );
  for (const role of ['student', 'admin', 'teacher']) {
    const links = navigationForRole(role);
    assert.equal(
      links.some((l) => l.to === '/lecturer/classes'),
      role === 'teacher',
    );
    if (role === 'teacher')
      assert.equal(
        links.some((l) => l.to === '/enrolments'),
        false,
      );
  }
});
