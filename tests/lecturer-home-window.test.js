import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  homeSessionsWindow,
  groupHomeSessions,
} from '../src/features/dashboard/services/home-sessions-window.js';

// Asia/Kuala_Lumpur is UTC+8 with no daylight saving.
test('window runs from the start of today to the end of day 7, in Kuala Lumpur time', () => {
  // 2026-03-02 22:30 in Kuala Lumpur
  const now = new Date('2026-03-02T14:30:00.000Z');
  assert.deepEqual(homeSessionsWindow(now), {
    from: '2026-03-01T16:00:00.000Z', // 2026-03-02 00:00 KL
    to: '2026-03-09T16:00:00.000Z', // 2026-03-10 00:00 KL
  });
});

test('window uses the Kuala Lumpur calendar day, not the UTC day', () => {
  // 2026-03-03 01:00 KL is still 2026-03-02 in UTC
  const now = new Date('2026-03-02T17:00:00.000Z');
  assert.equal(homeSessionsWindow(now).from, '2026-03-02T16:00:00.000Z');
});

const session = (id, startsAt, availability = 'upcoming') => ({
  id,
  starts_at: startsAt,
  availability,
});

test('sessions are split into Today and Upcoming, each sorted ascending', () => {
  const now = new Date('2026-03-02T04:00:00.000Z'); // 12:00 KL
  const result = groupHomeSessions(
    [
      session(4, '2026-03-04T01:00:00.000Z'),
      session(2, '2026-03-02T07:00:00.000Z'),
      session(1, '2026-03-02T01:00:00.000Z', 'ended'),
      session(3, '2026-03-03T01:00:00.000Z'),
    ],
    now,
  );
  assert.deepEqual(
    result.today.map((s) => s.id),
    [1, 2],
  );
  assert.deepEqual(
    result.upcoming.map((s) => s.id),
    [3, 4],
  );
});

test('a session starting after midnight in Kuala Lumpur belongs to the next day', () => {
  const now = new Date('2026-03-02T04:00:00.000Z');
  // 2026-03-03 00:30 KL
  const result = groupHomeSessions(
    [session(1, '2026-03-02T16:30:00.000Z')],
    now,
  );
  assert.deepEqual(result.today, []);
  assert.deepEqual(
    result.upcoming.map((s) => s.id),
    [1],
  );
});

test('sessions that started before today are dropped', () => {
  const now = new Date('2026-03-02T04:00:00.000Z');
  const result = groupHomeSessions(
    [session(1, '2026-03-01T15:00:00.000Z', 'ended')],
    now,
  );
  assert.deepEqual(result, { today: [], upcoming: [] });
});
