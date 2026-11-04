import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockClassRosterService } from '../src/features/enrolments/services/mock-class-roster.js';

test('mock class roster returns the first 20 students and class header for class 1', async () => {
  const service = createMockClassRosterService();
  const result = await service.listClassRoster(1, { page: 1, limit: 20 });

  assert.equal(result.data.length, 20);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 20,
    total: 25,
    totalPages: 2,
  });
  assert.equal(result.context.class.id, 1);
  assert.equal(result.context.class.course.code, 'COS30043');
  assert.equal(result.context.class.room_label, 'EN402');
  const first = result.data[0];
  assert.equal(first.class_id, 1);
  assert.equal(first.student_id, first.student.id);
  assert.equal(typeof first.student.name, 'string');
  assert.match(first.student.email, /@/);
});

test('mock class roster page 2 of class 1 holds the remaining 5 students', async () => {
  const service = createMockClassRosterService();
  const page1 = await service.listClassRoster('1', { page: 1, limit: 20 });
  const page2 = await service.listClassRoster('1', { page: 2, limit: 20 });

  assert.equal(page2.data.length, 5);
  assert.equal(page2.meta.page, 2);
  const ids = new Set([...page1.data, ...page2.data].map((r) => r.student_id));
  assert.equal(ids.size, 25);
});

test('mock class roster keeps the class header when the class has no students', async () => {
  const service = createMockClassRosterService();
  const result = await service.listClassRoster(3);

  assert.deepEqual(result.data, []);
  assert.equal(result.meta.total, 0);
  assert.equal(result.meta.totalPages, 1);
  assert.equal(result.context.class.course.code, 'COS20031');
});

test('mock class roster rejects unknown classes with a 404', async () => {
  const service = createMockClassRosterService();
  for (const id of [99, '99', 'abc', 'constructor', '__proto__', undefined]) {
    await assert.rejects(
      () => service.listClassRoster(id),
      (error) => error.status === 404 && error.code === 'RESOURCE_NOT_FOUND',
      String(id),
    );
  }
});

test('mock class roster honours an aborted signal', async () => {
  const service = createMockClassRosterService();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => service.listClassRoster(1, {}, { signal: controller.signal }),
    { name: 'AbortError' },
  );
});
