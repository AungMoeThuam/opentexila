import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sessionsOverlap,
  findScheduleConflicts,
  isSessionEditable,
  validateSessionTimes,
  getSessionConflicts,
} from '../src/features/scheduling/utils/schedule-conflicts.js';

const NOW = Date.parse('2026-11-10T00:00:00.000Z');

function createSession(overrides = {}) {
  return {
    id: 1,
    class_id: 1,
    lecturer: {
      id: 2,
      name: 'Lecturer One',
    },
    room_label: 'Room A',
    starts_at: '2026-11-16T01:00:00.000Z',
    late_after: '2026-11-16T01:10:00.000Z',
    ends_at: '2026-11-16T03:00:00.000Z',
    status: 'scheduled',
    ...overrides,
  };
}

// 1. Detect overlapping sessions
test('detects overlapping sessions', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    starts_at: '2026-11-16T02:00:00.000Z',
    ends_at: '2026-11-16T04:00:00.000Z',
  });

  assert.equal(sessionsOverlap(first, second), true);
});

// 2. Adjacent sessions are allowed
test('allows adjacent sessions', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    starts_at: '2026-11-16T03:00:00.000Z',
    ends_at: '2026-11-16T05:00:00.000Z',
  });

  assert.equal(sessionsOverlap(first, second), false);
  assert.deepEqual(findScheduleConflicts([first, second]), []);
});

// 3. Same class conflict
test('detects same-class conflicts', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    lecturer: { id: 3 },
    room_label: 'Room B',
  });

  const conflicts = findScheduleConflicts([first, second]);

  assert.deepEqual(conflicts, [
    {
      sessionId: 1,
      type: 'class',
      withSessionId: 2,
    },
  ]);
});

// 4. Same lecturer conflict
test('detects lecturer conflicts', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    class_id: 2,
    room_label: 'Room B',
  });

  const conflicts = findScheduleConflicts([first, second]);

  assert.deepEqual(conflicts, [
    {
      sessionId: 1,
      type: 'lecturer',
      withSessionId: 2,
    },
  ]);
});

// 5. Same room conflict
test('detects room conflicts', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    class_id: 2,
    lecturer: { id: 3 },
  });

  const conflicts = findScheduleConflicts([first, second]);

  assert.deepEqual(conflicts, [
    {
      sessionId: 1,
      type: 'room',
      withSessionId: 2,
    },
  ]);
});

// 6. Different classes, lecturers and rooms
test('allows overlapping sessions with different resources', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    class_id: 2,
    lecturer: { id: 3 },
    room_label: 'Room B',
  });

  assert.deepEqual(findScheduleConflicts([first, second]), []);
});

// 7. Cancelled sessions are ignored
test('ignores cancelled sessions', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    status: 'cancelled',
  });

  assert.deepEqual(findScheduleConflicts([first, second]), []);
});

// 8. Multiple conflicts
test('detects multiple conflict types', () => {
  const first = createSession();
  const second = createSession({ id: 2 });

  const conflicts = findScheduleConflicts([first, second]);

  assert.equal(conflicts.length, 3);

  assert.deepEqual(
    conflicts.map((conflict) => conflict.type),
    ['class', 'lecturer', 'room'],
  );
});

// 9. Future sessions can be moved
test('allows editing future scheduled sessions', () => {
  assert.equal(isSessionEditable(createSession(), NOW), true);
});

// 10. Started sessions cannot be moved
test('prevents editing started sessions', () => {
  const now = Date.parse('2026-11-16T02:00:00.000Z');

  assert.equal(isSessionEditable(createSession(), now), false);
});

// 11. Ended sessions cannot be moved
test('prevents editing ended sessions', () => {
  const now = Date.parse('2026-11-16T04:00:00.000Z');

  assert.equal(isSessionEditable(createSession(), now), false);
});

// 12. Cancelled sessions cannot be moved
test('prevents editing cancelled sessions', () => {
  const session = createSession({
    status: 'cancelled',
  });

  assert.equal(isSessionEditable(session, NOW), false);
});

// 13. Valid session times
test('accepts valid future session times', () => {
  const result = validateSessionTimes(createSession(), NOW);

  assert.equal(result.valid, true);
});

// 14. End time before start time
test('rejects end time before start time', () => {
  const session = createSession({
    ends_at: '2026-11-16T00:00:00.000Z',
  });

  assert.equal(validateSessionTimes(session, NOW).valid, false);
});

// 15. Invalid late threshold
test('rejects late threshold outside the session', () => {
  const session = createSession({
    late_after: '2026-11-16T04:00:00.000Z',
  });

  assert.equal(validateSessionTimes(session, NOW).valid, false);
});

// 16. Moving to the past
test('rejects session times in the past', () => {
  const now = Date.parse('2026-11-17T00:00:00.000Z');

  assert.equal(validateSessionTimes(createSession(), now).valid, false);
});

// 17. Invalid date
test('rejects invalid date values', () => {
  const session = createSession({
    starts_at: 'invalid-date',
  });

  assert.equal(validateSessionTimes(session, NOW).valid, false);
});

// 18. Retrieve conflicts for both affected sessions
test('returns conflicts for either affected session', () => {
  const conflicts = [
    {
      sessionId: 1,
      type: 'lecturer',
      withSessionId: 2,
    },
    {
      sessionId: 3,
      type: 'room',
      withSessionId: 4,
    },
  ];

  assert.equal(getSessionConflicts(conflicts, 1).length, 1);
  assert.equal(getSessionConflicts(conflicts, 2).length, 1);
  assert.equal(getSessionConflicts(conflicts, 99).length, 0);
});
