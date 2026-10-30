import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockClassSessionsService } from '../src/features/attendance/services/mock-class-sessions.js';

const NOW = new Date('2026-10-30T02:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const service = createMockClassSessionsService({ now: () => NOW });

const ITEM_KEYS = [
  'availability',
  'class',
  'class_id',
  'ends_at',
  'id',
  'late_after',
  'my_attendance',
  'starts_at',
  'state',
];

test('mock sessions include all four availability values', async () => {
  const { data } = await service.listMyClassSessions({ limit: 100 });
  const values = new Set(data.map((item) => item.availability));
  assert.deepEqual([...values].sort(), [
    'cancelled',
    'ended',
    'in_progress',
    'upcoming',
  ]);
  assert.equal(data.length, 14);
  assert.ok(new Set(data.map((item) => item.id)).size === data.length);
});

test('mock sessions are ordered by start time then id', async () => {
  const { data } = await service.listMyClassSessions({ limit: 100 });
  for (let i = 1; i < data.length; i++) {
    const prev = Date.parse(data[i - 1].starts_at);
    const next = Date.parse(data[i].starts_at);
    assert.ok(prev < next || (prev === next && data[i - 1].id < data[i].id));
  }
});

test('default paging returns all sessions with meta', async () => {
  const result = await service.listMyClassSessions();
  assert.equal(result.data.length, 14);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 20,
    total: 14,
    totalPages: 1,
  });
});

test('page 2 with a small limit returns the matching slice', async () => {
  const all = await service.listMyClassSessions({ limit: 100 });
  const page2 = await service.listMyClassSessions({ page: 2, limit: 5 });
  assert.deepEqual(
    page2.data.map((item) => item.id),
    all.data.slice(5, 10).map((item) => item.id),
  );
  assert.deepEqual(page2.meta, {
    page: 2,
    limit: 5,
    total: 14,
    totalPages: 3,
  });
  const page3 = await service.listMyClassSessions({ page: 3, limit: 5 });
  assert.equal(page3.data.length, 4);
});

test('classId filter accepts numbers and numeric strings', async () => {
  const byNumber = await service.listMyClassSessions({ classId: 1 });
  const byString = await service.listMyClassSessions({ classId: '1' });
  assert.ok(byNumber.data.length > 0);
  assert.ok(byNumber.data.every((item) => item.class_id === 1));
  assert.deepEqual(byString, byNumber);
  assert.equal(byNumber.meta.total, byNumber.data.length);
});

test('from is inclusive and to is exclusive on starts_at', async () => {
  const result = await service.listMyClassSessions({
    from: new Date(NOW.getTime() + DAY_MS),
    to: new Date(NOW.getTime() + 3 * DAY_MS).toISOString(),
  });
  assert.equal(result.meta.total, 2);
  assert.deepEqual(
    result.data.map((item) => item.starts_at),
    [
      new Date(NOW.getTime() + DAY_MS).toISOString(),
      new Date(NOW.getTime() + 2 * DAY_MS).toISOString(),
    ],
  );
});

test('empty result returns data [] with total 0 and totalPages 1', async () => {
  const result = await service.listMyClassSessions({ classId: 999 });
  assert.deepEqual(result, {
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
});

test('session items have the backend shape', async () => {
  const { data } = await service.listMyClassSessions({ limit: 100 });
  for (const item of data) {
    assert.deepEqual(Object.keys(item).sort(), ITEM_KEYS);
    assert.deepEqual(Object.keys(item.class).sort(), [
      'course',
      'id',
      'lecturer',
      'room_label',
      'section',
      'term',
    ]);
    assert.ok(['scheduled', 'cancelled'].includes(item.state));
    assert.equal(item.my_attendance, null);
    assert.equal(
      Date.parse(item.late_after) - Date.parse(item.starts_at),
      15 * 60 * 1000,
    );
  }
});

test('availability follows the injected clock', async () => {
  const { data } = await service.listMyClassSessions({ limit: 100 });
  const inProgress = data.find((item) => item.availability === 'in_progress');
  assert.ok(Date.parse(inProgress.starts_at) <= NOW.getTime());
  assert.ok(Date.parse(inProgress.ends_at) > NOW.getTime());
});

test('returned items are fresh copies', async () => {
  const first = await service.listMyClassSessions({ limit: 100 });
  first.data[0].class.room_label = 'CHANGED';
  first.data[0].state = 'cancelled';
  const second = await service.listMyClassSessions({ limit: 100 });
  assert.notEqual(second.data[0].class.room_label, 'CHANGED');
  assert.notEqual(second.data[0].state, 'cancelled');
});

test('an aborted signal rejects with AbortError', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    service.listMyClassSessions({}, { signal: controller.signal }),
    (error) => error.name === 'AbortError',
  );
});
