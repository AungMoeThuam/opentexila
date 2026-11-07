import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockMyClassesService } from '../src/features/enrolments/services/mock-my-classes.js';
import { useMyClasses } from '../src/features/enrolments/composables/use-my-classes.js';
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
test('obsolete responses cannot overwrite newer results', async () => {
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
  state.dispose();
});

test('failed class requests can be retried', async () => {
  const mock = createMockMyClassesService();
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
