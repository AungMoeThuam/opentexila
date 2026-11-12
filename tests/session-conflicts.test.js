import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTick, ref } from 'vue';
import { createApiClient } from '../src/shared/services/api-client.js';
import {
  CONFLICT_LABELS,
  MAX_LISTED_CONFLICTS,
  conflictRange,
  findSessionConflicts,
  reasonText,
} from '../src/features/courses/services/session-conflicts.js';
import { useSessionConflicts } from '../src/features/courses/composables/use-session-conflicts.js';
import { json } from './helpers/fixtures.js';

const at = (hours) => new Date(Date.UTC(2026, 10, 20, 0, 0) + hours * 3600_000);
const iso = (hours) => at(hours).toISOString();
const session = (id, over = {}) => ({
  id,
  class_id: 8,
  course: { code: 'COS20019', name: 'Networks' },
  section: 'A',
  lecturer: { id: 3, name: 'Lecturer Three' },
  room_label: 'Other room',
  starts_at: iso(9),
  late_after: iso(9.25),
  ends_at: iso(11),
  status: 'scheduled',
  ...over,
});
// The class being scheduled: class 7, lecturer 2, room EN402. 09:00 to 11:00.
const target = { classId: 7, lecturerId: 2, room: 'EN402' };
const window = { start: at(9), end: at(11) };

test('the day range covers a day either side', () => {
  assert.deepEqual(conflictRange(at(9), at(11)), {
    from: '2026-11-19',
    to: '2026-11-21',
  });
  assert.deepEqual(conflictRange(at(0), at(23)), {
    from: '2026-11-19',
    to: '2026-11-21',
  });
});

test('a session clashes when it shares the class, lecturer or room and overlaps', () => {
  const sessions = [
    session(1, { class_id: 7 }),
    session(2, { lecturer: { id: 2, name: 'Lecturer One' } }),
    session(3, { room_label: ' en402 ' }),
    session(4), // overlaps in time but shares nothing
    session(5, {
      class_id: 7,
      lecturer: { id: 2, name: 'L' },
      room_label: 'EN402',
    }),
  ];
  const found = findSessionConflicts(sessions, { ...target, ...window });
  assert.deepEqual(
    found.map((item) => [item.session.id, item.types]),
    [
      [1, ['class']],
      [2, ['lecturer']],
      [3, ['room']],
      [5, ['class', 'lecturer', 'room']],
    ],
  );
});

test('touching, cancelled and distant sessions do not clash', () => {
  const sessions = [
    session(1, { class_id: 7, starts_at: iso(7), ends_at: iso(9) }), // ends at the start
    session(2, { class_id: 7, starts_at: iso(11), ends_at: iso(13) }), // starts at the end
    session(3, { class_id: 7, status: 'cancelled' }),
    session(4, { class_id: 7, starts_at: iso(30), ends_at: iso(32) }),
  ];
  assert.deepEqual(
    findSessionConflicts(sessions, { ...target, ...window }),
    [],
  );
  // One minute of overlap is enough.
  const inside = [
    session(5, { class_id: 7, starts_at: iso(10.99), ends_at: iso(13) }),
  ];
  assert.equal(
    findSessionConflicts(inside, { ...target, ...window }).length,
    1,
  );
});

test('without usable times there is nothing to compare', () => {
  const sessions = [session(1, { class_id: 7 })];
  assert.deepEqual(
    findSessionConflicts(sessions, { ...target, start: null, end: null }),
    [],
  );
  assert.deepEqual(
    findSessionConflicts(sessions, { ...target, start: at(11), end: at(9) }),
    [],
  );
  assert.deepEqual(
    findSessionConflicts(sessions, { ...target, start: at(9), end: at(9) }),
    [],
  );
  assert.deepEqual(findSessionConflicts([], { ...target, ...window }), []);
});

test('missing target values do not match everything', () => {
  const sessions = [
    session(1, { room_label: '' }),
    session(2, { lecturer: undefined }),
  ];
  const found = findSessionConflicts(sessions, {
    classId: undefined,
    lecturerId: undefined,
    room: '',
    ...window,
  });
  assert.deepEqual(found, []);
});

test('clashes are sorted and cut to ten, with the details a list needs', () => {
  const many = Array.from({ length: 14 }, (_, index) =>
    session(100 + index, { class_id: 7, starts_at: iso(10.9 - index * 0.01) }),
  );
  const found = findSessionConflicts(many, { ...target, ...window });
  assert.equal(found.length, MAX_LISTED_CONFLICTS);
  const starts = found.map((item) => Date.parse(item.session.starts_at));
  assert.deepEqual(
    starts,
    [...starts].sort((a, b) => a - b),
  );
  assert.deepEqual(found[0].session.class.course, {
    code: 'COS20019',
    name: 'Networks',
  });
  assert.equal(found[0].session.lecturer.name, 'Lecturer Three');
  assert.equal(found[0].session.room_label, 'Other room');
});

test('reasons read as short sentences', () => {
  assert.equal(CONFLICT_LABELS.lecturer, 'Same lecturer');
  assert.equal(reasonText(['lecturer']), 'Same lecturer');
  assert.equal(reasonText(['lecturer', 'room']), 'Same lecturer and same room');
  assert.equal(
    reasonText(['class', 'lecturer', 'room']),
    'Same class, same lecturer and same room',
  );
  assert.equal(reasonText([]), '');
});

function liveCheck({ list, times }) {
  const calls = [];
  const timesRef = ref(times);
  const check = useSessionConflicts({
    service: {
      list: async (range, options) => {
        calls.push(range);
        return list(range, options);
      },
    },
    target: () => target,
    times: () => timesRef.value,
    delay: 0,
  });
  const settle = async () => {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 15));
  };
  return { check, calls, timesRef, settle };
}

test('typing times loads that day once and shows the clashes', async () => {
  const { check, calls, timesRef, settle } = liveCheck({
    list: async () => [session(1, { class_id: 7 }), session(2)],
    times: { start: null, end: null },
  });
  await settle();
  assert.deepEqual(calls, [], 'nothing is loaded without times');
  assert.deepEqual(check.conflicts.value, []);
  timesRef.value = window;
  await settle();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { from: '2026-11-19', to: '2026-11-21' });
  assert.deepEqual(
    check.conflicts.value.map((item) => item.session.id),
    [1],
  );
  // Moving within the same days needs no new request.
  timesRef.value = { start: at(12), end: at(14) };
  await settle();
  assert.equal(calls.length, 1, 'the loaded days are reused');
  assert.deepEqual(check.conflicts.value, []);
  timesRef.value = { start: at(9.5), end: at(10) };
  await settle();
  assert.equal(check.conflicts.value.length, 1);
  // A different day loads again.
  timesRef.value = { start: at(33), end: at(35) };
  await settle();
  assert.equal(calls.length, 2);
  check.stop();
});

test('clearing the times clears the warning', async () => {
  const { check, timesRef, settle } = liveCheck({
    list: async () => [session(1, { class_id: 7 })],
    times: window,
  });
  await settle();
  assert.equal(check.conflicts.value.length, 1);
  timesRef.value = { start: null, end: null };
  await settle();
  assert.deepEqual(check.conflicts.value, []);
  assert.equal(check.error.value, null);
  check.stop();
});

test('a failed load leaves the form usable and says the check could not run', async () => {
  let fail = true;
  const { check, timesRef, settle } = liveCheck({
    list: async () => {
      if (fail) throw new Error('Offline');
      return [session(1, { class_id: 7 })];
    },
    times: window,
  });
  await settle();
  assert.equal(check.error.value.message, 'Offline');
  assert.deepEqual(check.conflicts.value, []);
  assert.equal(check.loading.value, false);
  // A different day tries again and recovers.
  fail = false;
  timesRef.value = { start: at(33), end: at(35) };
  await settle();
  assert.equal(check.error.value, null);
  check.stop();
});

test('an old answer never replaces a newer one', async () => {
  const release = [];
  const { check, timesRef, settle } = liveCheck({
    list: (range) =>
      new Promise((resolve) =>
        release.push(() =>
          resolve(
            range.from === '2026-11-19' ? [session(1, { class_id: 7 })] : [],
          ),
        ),
      ),
    times: window,
  });
  await settle(); // first request is waiting
  timesRef.value = { start: at(33), end: at(35) };
  await settle(); // second request is waiting
  release[1]();
  await settle();
  release[0](); // the first answer arrives late
  await settle();
  assert.deepEqual(check.conflicts.value, [], 'the late answer was ignored');
  check.stop();
});

test('the API client keeps the list of clashing sessions of a 409', async () => {
  const conflicts = [{ types: ['lecturer'], session: { id: 12 } }];
  const api = createApiClient({
    fetcher: async (url) =>
      url.endsWith('/auth/csrf')
        ? json({ data: { csrfToken: 't' } })
        : json(
            {
              error: {
                code: 'SCHEDULE_CONFLICT',
                message:
                  'This time overlaps a scheduled session of the same lecturer.',
                fields: {},
                conflicts,
              },
            },
            409,
          ),
  });
  await assert.rejects(
    api.request('/classes/7/class-sessions', { method: 'POST', body: {} }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, 'SCHEDULE_CONFLICT');
      assert.deepEqual(error.conflicts, conflicts);
      return true;
    },
  );
  // Other errors, and bad values, give an empty list.
  const plain = createApiClient({
    fetcher: async () =>
      json({ error: { code: 'X', message: 'm', conflicts: 'nope' } }, 422),
  });
  await assert.rejects(plain.request('/x'), (error) => {
    assert.deepEqual(error.conflicts, []);
    return true;
  });
});
