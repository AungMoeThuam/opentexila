import test from 'node:test';
import assert from 'node:assert/strict';

import { useTimetable } from '../src/features/scheduling/composables/use-timetable.js';

const NOW = Date.parse('2026-11-10T00:00:00.000Z');

const ORIGINAL_START = '2026-11-16T01:00:00.000Z';
const NEW_START = '2026-11-17T02:00:00.000Z';
const THIRD_START = '2026-11-18T02:00:00.000Z';

function createSession(overrides = {}) {
  return {
    id: 1,
    class_id: 1,
    lecturer: { id: 2, name: 'Lecturer One' },
    room_label: 'Room A',
    starts_at: ORIGINAL_START,
    late_after: '2026-11-16T01:10:00.000Z',
    ends_at: '2026-11-16T03:00:00.000Z',
    status: 'scheduled',
    ...overrides,
  };
}

function createTimetable(sessions = [createSession()]) {
  return useTimetable(sessions, {
    now: () => NOW,
  });
}

// 1. Initial state
test('initialises a clean timetable', () => {
  const timetable = createTimetable();

  assert.equal(timetable.sessions.value.length, 1);
  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canUndo.value, false);
  assert.equal(timetable.canRedo.value, false);
  assert.equal(timetable.canSave.value, false);
});

// 2. Move session
test('moves a session and preserves its duration', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(1, NEW_START);

  assert.equal(result.success, true);
  assert.equal(timetable.sessions.value[0].starts_at, NEW_START);
  assert.equal(timetable.sessions.value[0].ends_at, '2026-11-17T04:00:00.000Z');
  assert.equal(timetable.isDirty.value, true);
});

// 3. Preserve late threshold
test('preserves the late threshold offset', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);

  assert.equal(
    timetable.sessions.value[0].late_after,
    '2026-11-17T02:10:00.000Z',
  );
});

// 4. Original session remains unchanged
test('does not mutate the original input sessions', () => {
  const original = createSession();
  const timetable = createTimetable([original]);

  timetable.moveSession(1, NEW_START);

  assert.equal(original.starts_at, ORIGINAL_START);
});

// 5. Undo
test('undo restores the previous session time', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);

  assert.equal(timetable.undo(), true);

  assert.equal(timetable.sessions.value[0].starts_at, ORIGINAL_START);

  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canRedo.value, true);
});

// 6. Redo
test('redo restores the undone session move', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);
  timetable.undo();

  assert.equal(timetable.redo(), true);

  assert.equal(timetable.sessions.value[0].starts_at, NEW_START);

  assert.equal(timetable.isDirty.value, true);
});

// 7. Clear redo after a new move
test('a new move clears the redo history', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);
  timetable.undo();

  timetable.moveSession(1, THIRD_START);

  assert.equal(timetable.canRedo.value, false);
  assert.equal(timetable.redo(), false);
});

// 8. History limit
test('limits undo history to 50 operations', () => {
  const timetable = createTimetable();
  const start = Date.parse(ORIGINAL_START);

  for (let i = 1; i <= 55; i++) {
    const newTime = new Date(start + i * 60 * 1000).toISOString();

    assert.equal(timetable.moveSession(1, newTime).success, true);
  }

  let undoCount = 0;

  while (timetable.undo()) {
    undoCount++;
  }

  assert.equal(undoCount, 50);
  assert.equal(timetable.canUndo.value, false);
});

// 9. Discard changes
test('discard restores original sessions and clears history', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);
  timetable.discardChanges();

  assert.equal(timetable.sessions.value[0].starts_at, ORIGINAL_START);

  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canUndo.value, false);
  assert.equal(timetable.canRedo.value, false);
});

// 10. Prevent saving conflicts
test('prevents saving conflicting timetable changes', () => {
  const first = createSession();

  const second = createSession({
    id: 2,
    class_id: 2,
    starts_at: NEW_START,
    late_after: '2026-11-17T02:10:00.000Z',
    ends_at: '2026-11-17T04:00:00.000Z',
  });

  const timetable = createTimetable([first, second]);

  timetable.moveSession(1, NEW_START);

  assert.equal(timetable.conflicts.value.length, 2);
  assert.equal(timetable.canSave.value, false);
  assert.equal(timetable.prepareSave().success, false);
});

// 11. Prepare backend payload
test('prepares only changed sessions for batch saving', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);

  assert.equal(timetable.canSave.value, true);

  assert.deepEqual(timetable.prepareSave(), {
    success: true,
    payload: {
      changes: [
        {
          id: 1,
          starts_at: NEW_START,
          late_after: '2026-11-17T02:10:00.000Z',
          ends_at: '2026-11-17T04:00:00.000Z',
        },
      ],
    },
  });
});

// 12. Reject past start time
test('rejects moving a session into the past', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(1, '2026-11-09T01:00:00.000Z');

  assert.equal(result.success, false);
  assert.equal(timetable.isDirty.value, false);
});

// 13. Prevent editing started sessions
test('rejects moving sessions that have already started', () => {
  const timetable = useTimetable([createSession()], {
    now: () => Date.parse('2026-11-16T02:00:00.000Z'),
  });

  const result = timetable.moveSession(1, NEW_START);

  assert.equal(result.success, false);
  assert.equal(timetable.isDirty.value, false);
});

// 14. Prevent editing cancelled sessions
test('rejects moving cancelled sessions', () => {
  const timetable = createTimetable([createSession({ status: 'cancelled' })]);

  const result = timetable.moveSession(1, NEW_START);

  assert.equal(result.success, false);
  assert.equal(timetable.isDirty.value, false);
});

// 15. Reload sessions
test('loading sessions resets draft changes and history', () => {
  const timetable = createTimetable();

  timetable.moveSession(1, NEW_START);

  timetable.loadSessions([createSession({ id: 2 })]);

  assert.equal(timetable.sessions.value[0].id, 2);
  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canUndo.value, false);
  assert.equal(timetable.canRedo.value, false);
});

// 16. No unnecessary history
test('moving a session to the same time creates no history', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(1, ORIGINAL_START);

  assert.equal(result.success, true);
  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canUndo.value, false);
});

// 17. Recheck editability before saving
test('rejects saving when a session becomes non-editable', () => {
  let currentTime = NOW;

  const timetable = useTimetable([createSession()], {
    now: () => currentTime,
  });

  timetable.moveSession(1, NEW_START);

  currentTime = Date.parse('2026-11-16T02:00:00.000Z');

  assert.equal(timetable.prepareSave().success, false);
});

// 18. Reject missing sessions
test('rejects moving an unknown session', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(999, NEW_START);

  assert.equal(result.success, false);
  assert.equal(timetable.isDirty.value, false);
});

// 19. Move with a custom end time
test('allows changing the end time in a move operation', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(
    1,
    NEW_START,
    '2026-11-17T05:00:00.000Z',
  );

  assert.equal(result.success, true);

  assert.equal(timetable.sessions.value[0].starts_at, NEW_START);

  assert.equal(timetable.sessions.value[0].ends_at, '2026-11-17T05:00:00.000Z');

  assert.equal(
    timetable.sessions.value[0].late_after,
    '2026-11-17T02:10:00.000Z',
  );

  assert.equal(timetable.undo(), true);

  assert.equal(timetable.sessions.value[0].ends_at, '2026-11-16T03:00:00.000Z');
});

// 20. Reject an invalid custom end time
test('rejects an invalid custom end time', () => {
  const timetable = createTimetable();

  const result = timetable.moveSession(
    1,
    NEW_START,
    '2026-11-17T01:00:00.000Z',
  );

  assert.equal(result.success, false);
  assert.equal(timetable.isDirty.value, false);
  assert.equal(timetable.canUndo.value, false);
});
