import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBMITTING_LABEL,
  SUBMIT_LABEL,
  SUBMIT_WARNING,
  roomWindow,
  roomsById,
  waitingDetails,
} from '../src/features/attendance/services/waiting-sessions.js';
import { useSessionRooms } from '../src/features/attendance/composables/use-session-rooms.js';

// 09:00-11:00 in Kuala Lumpur (UTC+8).
const waiting = (id, extra = {}) => ({
  classSessionId: id,
  classId: 7,
  date: '2026-11-12',
  startsAt: '2026-11-12T01:00:00.000Z',
  endsAt: '2026-11-12T03:00:00.000Z',
  pendingCount: 8,
  ...extra,
});

test('the card says submit the attendance record, and what that does', () => {
  assert.equal(SUBMIT_LABEL, 'Submit attendance record');
  assert.equal(SUBMITTING_LABEL, 'Submitting…');
  assert.match(SUBMIT_WARNING, /marks pending students as absent/i);
  for (const text of [SUBMIT_LABEL, SUBMITTING_LABEL, SUBMIT_WARNING])
    assert.equal(/finalis/i.test(text), false, text);
});

test('a row shows the day, the time, the room and the pending students', () => {
  assert.equal(
    waitingDetails(waiting(30), { 30: 'Demo room 1' }),
    'Thu, 12 Nov 2026, 09:00–11:00 · Demo room 1 · 8 pending',
  );
});

test('two sessions of one class on one day can be told apart by time and room', () => {
  const first = waiting(30, {
    startsAt: '2026-11-12T01:00:00.000Z',
    endsAt: '2026-11-12T03:00:00.000Z',
  });
  const second = waiting(31, {
    startsAt: '2026-11-12T06:00:00.000Z',
    endsAt: '2026-11-12T08:00:00.000Z',
  });
  const rooms = { 30: 'Demo room 1', 31: 'Demo room 2' };
  assert.notEqual(waitingDetails(first, rooms), waitingDetails(second, rooms));
  assert.match(waitingDetails(second, rooms), /14:00–16:00 · Demo room 2/);
});

test('a part that is not known is left out, never a dash', () => {
  // No room known.
  assert.equal(
    waitingDetails(waiting(30)),
    'Thu, 12 Nov 2026, 09:00–11:00 · 8 pending',
  );
  // No times: the day from the API is used.
  assert.equal(
    waitingDetails({ classSessionId: 30, date: '2026-11-12', pendingCount: 2 }),
    '2026-11-12 · 2 pending',
  );
  assert.equal(
    waitingDetails({ classSessionId: 30, pendingCount: 1 }),
    '1 pending',
  );
  assert.equal(/—/.test(waitingDetails(waiting(30))), false);
});

test('one time window holds all the waiting sessions', () => {
  assert.deepEqual(
    roomWindow([
      waiting(30, { startsAt: '2026-11-12T06:00:00.000Z' }),
      waiting(31, { startsAt: '2026-11-05T01:00:00.000Z' }),
    ]),
    { from: '2026-11-05T01:00:00.000Z', to: '2026-11-12T06:01:00.000Z' },
  );
  assert.equal(roomWindow([]), null);
  assert.equal(roomWindow([{ classSessionId: 1, date: '2026-11-12' }]), null);
});

test('rooms are read from the session list, with the class room as a fallback', () => {
  assert.deepEqual(
    roomsById([
      { id: 30, room_label: 'Demo room 1', class: { room_label: 'Other' } },
      { id: 31, class: { room_label: 'Class room' } },
      { id: 32 },
      null,
    ]),
    { 30: 'Demo room 1', 31: 'Class room' },
  );
});

test('the rooms are loaded with one request for the window', async () => {
  const calls = [];
  const rooms = useSessionRooms({
    service: {
      async listMyClassSessions(params) {
        calls.push(params);
        return { data: [{ id: 30, room_label: 'Demo room 1' }] };
      },
    },
  });
  await rooms.load([waiting(30), waiting(31)]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].limit, 100);
  assert.equal(calls[0].from, '2026-11-12T01:00:00.000Z');
  assert.deepEqual(rooms.rooms.value, { 30: 'Demo room 1' });
});

test('nothing is asked when no session is waiting', async () => {
  let asked = false;
  const rooms = useSessionRooms({
    service: {
      async listMyClassSessions() {
        asked = true;
        return { data: [] };
      },
    },
  });
  await rooms.load([waiting(30)]);
  await rooms.load([]);
  assert.equal(rooms.rooms.value && Object.keys(rooms.rooms.value).length, 0);
  assert.equal(asked, true, 'the first load asked once');
});

test('a failed room request leaves the rooms out and shows nothing', async () => {
  const rooms = useSessionRooms({
    service: {
      async listMyClassSessions() {
        throw new Error('Offline');
      },
    },
  });
  await rooms.load([waiting(30)]);
  assert.deepEqual(rooms.rooms.value, {});
});

test('a newer load replaces an older one and stop cancels it', async () => {
  const signals = [];
  let release;
  const slow = new Promise((resolve) => {
    release = resolve;
  });
  let call = 0;
  const rooms = useSessionRooms({
    service: {
      async listMyClassSessions(params, { signal }) {
        signals.push(signal);
        call += 1;
        if (call === 1) {
          await slow;
          return { data: [{ id: 30, room_label: 'Old room' }] };
        }
        return { data: [{ id: 30, room_label: 'New room' }] };
      },
    },
  });
  const first = rooms.load([waiting(30)]);
  await rooms.load([waiting(30)]);
  release();
  await first;
  assert.equal(signals[0].aborted, true);
  assert.deepEqual(rooms.rooms.value, { 30: 'New room' });
  rooms.stop();
  assert.equal(signals.at(-1).aborted, true);
});
