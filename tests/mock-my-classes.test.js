import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockMyClassesService } from '../src/features/enrolments/services/mock-my-classes.js';
import { createMockClassRosterService } from '../src/features/enrolments/services/mock-class-roster.js';
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
