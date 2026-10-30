import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { buildMockClassSessions } from '../src/features/attendance/services/mock-class-sessions.js';
import { createMockClassSessionRecordsService } from '../src/features/attendance/services/mock-class-session-records.js';

const NOW = new Date('2026-10-30T02:00:00.000Z');
const service = createMockClassSessionRecordsService({ now: () => NOW });
const sessions = buildMockClassSessions(NOW.getTime());

// Ids from the page-1 schedule: 6 is in progress, 4 and 9 are cancelled,
// 7 is upcoming and 1 is ended.
const IN_PROGRESS_ID = 6;
const CANCELLED_ID = 4;
const UPCOMING_ID = 7;
const ENDED_ID = 1;

const RECORD_KEYS = [
  'checked_in_at',
  'class_session_id',
  'status',
  'student',
  'student_id',
];

const statusSet = (data) => [...new Set(data.map((row) => row.status))].sort();

test('unknown class session id rejects with a 404 ApiError', async () => {
  for (const id of [999, '999', 'abc', 0]) {
    await assert.rejects(
      service.listClassSessionRecords(id),
      (error) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.code === 'RESOURCE_NOT_FOUND' &&
        error.message === 'This class session was not found.',
    );
  }
});

test('upcoming and cancelled sessions have no rows but still return context', async () => {
  for (const id of [UPCOMING_ID, CANCELLED_ID]) {
    const result = await service.listClassSessionRecords(id);
    assert.deepEqual(result.data, []);
    assert.equal(result.context.class_session_id, id);
    assert.deepEqual(result.meta, {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });
  }
});

test('ended session has present, late and absent but never pending', async () => {
  const { data } = await service.listClassSessionRecords(ENDED_ID, {
    limit: 100,
  });
  assert.equal(data.length, 24);
  assert.deepEqual(statusSet(data), ['absent', 'late', 'present']);
});

test('in-progress session has present, late and pending but never absent', async () => {
  const { data } = await service.listClassSessionRecords(IN_PROGRESS_ID, {
    limit: 100,
  });
  assert.equal(data.length, 24);
  assert.deepEqual(statusSet(data), ['late', 'pending', 'present']);
});

test('status filter returns only matching rows and counts them in meta', async () => {
  const all = await service.listClassSessionRecords(ENDED_ID, { limit: 100 });
  for (const status of ['present', 'late', 'absent']) {
    const result = await service.listClassSessionRecords(ENDED_ID, {
      status,
      limit: 100,
    });
    const expected = all.data.filter((row) => row.status === status);
    assert.ok(expected.length > 0);
    assert.deepEqual(result.data, expected);
    assert.equal(result.meta.total, expected.length);
  }
  const pending = await service.listClassSessionRecords(IN_PROGRESS_ID, {
    status: 'pending',
  });
  assert.ok(pending.data.every((row) => row.status === 'pending'));
  assert.equal(pending.meta.total, pending.data.length);
});

test('blank status is treated as no filter', async () => {
  const all = await service.listClassSessionRecords(ENDED_ID);
  const blank = await service.listClassSessionRecords(ENDED_ID, {
    status: '',
  });
  assert.deepEqual(blank, all);
});

test('rows are ordered by student id ascending', async () => {
  const { data } = await service.listClassSessionRecords(ENDED_ID, {
    limit: 100,
  });
  for (let i = 1; i < data.length; i++) {
    assert.ok(data[i - 1].student_id < data[i].student_id);
  }
  assert.equal(data[0].student_id, 3);
  assert.equal(data[data.length - 1].student_id, 26);
});

test('default paging is page 1 with limit 20', async () => {
  const result = await service.listClassSessionRecords(ENDED_ID);
  assert.equal(result.data.length, 20);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 20,
    total: 24,
    totalPages: 2,
  });
});

test('paging returns the matching slice and total pages', async () => {
  const all = await service.listClassSessionRecords(ENDED_ID, { limit: 100 });
  const page2 = await service.listClassSessionRecords(ENDED_ID, {
    page: 2,
    limit: 5,
  });
  assert.deepEqual(page2.data, all.data.slice(5, 10));
  assert.deepEqual(page2.meta, {
    page: 2,
    limit: 5,
    total: 24,
    totalPages: 5,
  });
  const page5 = await service.listClassSessionRecords(ENDED_ID, {
    page: 5,
    limit: 5,
  });
  assert.equal(page5.data.length, 4);
});

test('paging meta counts filtered rows', async () => {
  const result = await service.listClassSessionRecords(IN_PROGRESS_ID, {
    status: 'late',
    limit: 1,
    page: 1,
  });
  assert.equal(result.data.length, 1);
  assert.ok(result.meta.total > 1);
  assert.equal(result.meta.totalPages, result.meta.total);
});

test('records keep the backend shape', async () => {
  const { data } = await service.listClassSessionRecords(IN_PROGRESS_ID, {
    limit: 100,
  });
  for (const row of data) {
    assert.deepEqual(Object.keys(row).sort(), RECORD_KEYS);
    assert.equal(row.class_session_id, IN_PROGRESS_ID);
    assert.deepEqual(Object.keys(row.student).sort(), ['id', 'name']);
    assert.equal(row.student.id, row.student_id);
  }
});

test('checked_in_at follows the status rules', async () => {
  for (const id of [IN_PROGRESS_ID, ENDED_ID]) {
    const session = sessions.find((item) => item.id === id);
    const startMs = Date.parse(session.starts_at);
    const lateMs = Date.parse(session.late_after);
    const endMs = Date.parse(session.ends_at);
    const { data } = await service.listClassSessionRecords(id, { limit: 100 });
    for (const row of data) {
      if (row.status === 'present') {
        const at = Date.parse(row.checked_in_at);
        assert.ok(at > startMs && at < lateMs);
      } else if (row.status === 'late') {
        const at = Date.parse(row.checked_in_at);
        assert.ok(at > lateMs && at < endMs);
      } else {
        assert.equal(row.checked_in_at, null);
      }
    }
  }
});

test('records are deterministic for the same clock and params', async () => {
  const first = await service.listClassSessionRecords(ENDED_ID, {
    page: 2,
    limit: 7,
  });
  const second = await service.listClassSessionRecords(ENDED_ID, {
    page: 2,
    limit: 7,
  });
  assert.deepEqual(first, second);
});

test('context matches the page-1 session', async () => {
  const session = sessions.find((item) => item.id === IN_PROGRESS_ID);
  const { context } = await service.listClassSessionRecords(IN_PROGRESS_ID);
  assert.deepEqual(context, {
    class_session_id: session.id,
    class: session.class,
    starts_at: session.starts_at,
    late_after: session.late_after,
    ends_at: session.ends_at,
    class_state: 'scheduled',
  });

  const cancelled = await service.listClassSessionRecords(CANCELLED_ID);
  assert.equal(cancelled.context.class_state, 'cancelled');
  assert.deepEqual(
    cancelled.context.class,
    sessions.find((item) => item.id === CANCELLED_ID).class,
  );
});

test('returned rows and context are fresh copies', async () => {
  const first = await service.listClassSessionRecords(ENDED_ID, { limit: 100 });
  first.data[0].student.name = 'CHANGED';
  first.context.class.room_label = 'CHANGED';
  const second = await service.listClassSessionRecords(ENDED_ID, {
    limit: 100,
  });
  assert.notEqual(second.data[0].student.name, 'CHANGED');
  assert.notEqual(second.context.class.room_label, 'CHANGED');
});

test('an aborted signal rejects with AbortError', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    service.listClassSessionRecords(
      ENDED_ID,
      {},
      {
        signal: controller.signal,
      },
    ),
    (error) => error.name === 'AbortError',
  );
});
