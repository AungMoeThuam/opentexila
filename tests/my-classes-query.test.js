import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMyClassesPath } from '../src/features/enrolments/services/my-classes-service.js';
test('lecturer class query defaults and validation', async (t) => {
  assert.equal(buildMyClassesPath(), '/me/classes?page=1&limit=20');
  for (const [name, params] of Object.entries({
    page: { page: 0 },
    limit: { limit: 101 },
    courseId: { courseId: '1e2' },
    term: { term: ' ' },
  })) {
    await t.test(name, () =>
      assert.throws(() => buildMyClassesPath(params), RangeError),
    );
  }
});
