import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayBounds,
  sessionPhase,
  sessionsForToday,
  todayRange,
} from '../src/features/dashboard/services/admin-home-today.js';
import { useAdminTodaySessions } from '../src/features/dashboard/composables/use-admin-today-sessions.js';
import { ApiError } from '../src/shared/services/api-client.js';

// 2026-11-14 10:00 in Kuala Lumpur (UTC+8) is 02:00 UTC.
const NOW = new Date('2026-11-14T02:00:00.000Z');

const session = (id, startsAt, endsAt, status = 'scheduled') => ({
  id,
  class_id: 1,
  status,
  starts_at: startsAt,
  ends_at: endsAt,
});

test('the day is a day in the app time zone, not in UTC', () => {
  const { start, end } = dayBounds(NOW);
  // 14 Nov 00:00 in Kuala Lumpur is 13 Nov 16:00 UTC.
  assert.equal(new Date(start).toISOString(), '2026-11-13T16:00:00.000Z');
  assert.equal(new Date(end).toISOString(), '2026-11-14T16:00:00.000Z');
});

test('the request covers the day before and the day after', () => {
  assert.deepEqual(todayRange(NOW), { from: '2026-11-13', to: '2026-11-15' });
});

test('a session is upcoming, in progress, ended or cancelled', () => {
  const s = session(1, '2026-11-14T03:00:00.000Z', '2026-11-14T05:00:00.000Z');
  assert.equal(sessionPhase(s, NOW), 'upcoming');
  assert.equal(
    sessionPhase(s, new Date('2026-11-14T04:00:00.000Z')),
    'in_progress',
  );
  assert.equal(sessionPhase(s, new Date('2026-11-14T05:00:00.000Z')), 'ended');
  assert.equal(sessionPhase({ ...s, status: 'cancelled' }, NOW), 'cancelled');
});

test('only sessions on today are kept, earliest first', () => {
  const sessions = [
    // 14 Nov 15:00-17:00 KL: today.
    session(3, '2026-11-14T07:00:00.000Z', '2026-11-14T09:00:00.000Z'),
    // 14 Nov 08:00-10:00 KL: today.
    session(2, '2026-11-14T00:00:00.000Z', '2026-11-14T02:00:00.000Z'),
    // 13 Nov 20:00-22:00 KL: yesterday.
    session(1, '2026-11-13T12:00:00.000Z', '2026-11-13T14:00:00.000Z'),
    // 15 Nov 09:00-11:00 KL: tomorrow.
    session(4, '2026-11-15T01:00:00.000Z', '2026-11-15T03:00:00.000Z'),
  ];
  const result = sessionsForToday(sessions, NOW);
  assert.deepEqual(
    result.map((item) => item.id),
    [2, 3],
  );
  assert.deepEqual(
    result.map((item) => item.phase),
    ['ended', 'upcoming'],
  );
  // The given sessions are not changed.
  assert.equal('phase' in sessions[0], false);
});

test('a session that ends at midnight belongs to the day that ends', () => {
  // 13 Nov 22:00 to 14 Nov 00:00 KL.
  const late = session(
    1,
    '2026-11-13T14:00:00.000Z',
    '2026-11-13T16:00:00.000Z',
  );
  assert.deepEqual(sessionsForToday([late], NOW), []);
});

test('cancelled sessions still show, marked as cancelled', () => {
  const result = sessionsForToday(
    [
      session(
        1,
        '2026-11-14T03:00:00.000Z',
        '2026-11-14T05:00:00.000Z',
        'cancelled',
      ),
    ],
    NOW,
  );
  assert.equal(result[0].phase, 'cancelled');
});

test('today sessions load, set the state and ask for the right dates', async () => {
  const requests = [];
  const today = useAdminTodaySessions({
    now: () => NOW,
    timetableService: {
      list: async (range) => {
        requests.push(range);
        return [
          session(1, '2026-11-14T03:00:00.000Z', '2026-11-14T05:00:00.000Z'),
        ];
      },
    },
  });
  assert.equal(today.state.value, 'loading');
  await today.load();
  assert.equal(today.state.value, 'success');
  assert.equal(today.sessions.value.length, 1);
  assert.deepEqual(requests, [{ from: '2026-11-13', to: '2026-11-15' }]);
});

test('no sessions today is the empty state', async () => {
  const today = useAdminTodaySessions({
    now: () => NOW,
    timetableService: { list: async () => [] },
  });
  await today.load();
  assert.equal(today.state.value, 'empty');
});

test('a failure shows the error state and Retry loads again', async () => {
  let fail = true;
  const today = useAdminTodaySessions({
    now: () => NOW,
    timetableService: {
      list: async () => {
        if (fail) throw new ApiError('Offline', { code: 'NETWORK_ERROR' });
        return [
          session(1, '2026-11-14T03:00:00.000Z', '2026-11-14T05:00:00.000Z'),
        ];
      },
    },
  });
  await today.load();
  assert.equal(today.state.value, 'error');
  assert.deepEqual(today.sessions.value, []);
  fail = false;
  await today.retry();
  assert.equal(today.state.value, 'success');
  assert.equal(today.error.value, null);
});

test('a newer load replaces an older one', async () => {
  let release;
  const slow = new Promise((resolve) => {
    release = resolve;
  });
  let call = 0;
  const today = useAdminTodaySessions({
    now: () => NOW,
    timetableService: {
      list: async () => {
        call += 1;
        if (call === 1) {
          await slow;
          return [
            session(9, '2026-11-14T03:00:00.000Z', '2026-11-14T05:00:00.000Z'),
          ];
        }
        return [];
      },
    },
  });
  const first = today.load();
  await today.load();
  release();
  await first;
  assert.equal(today.state.value, 'empty');
  assert.deepEqual(today.sessions.value, []);
});
