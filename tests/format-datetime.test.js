import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  formatSessionWindow,
} from '../src/shared/utils/format-datetime.js';
import {
  AVAILABILITY_STATUS,
  statusFor,
} from '../src/features/attendance/components/availability-status.js';

test('UTC session times render as Kuala Lumpur wall-clock time and date', () => {
  assert.deepEqual(
    formatSessionWindow('2026-10-29T01:00:00Z', '2026-10-29T03:00:00Z'),
    { date: 'Thu, 29 Oct 2026', time: '09:00–11:00' },
  );
  assert.equal(formatDate('2026-10-29T01:00:00Z'), 'Thu, 29 Oct 2026');
});

test('a session crossing midnight in Kuala Lumpur notes the end date', () => {
  assert.deepEqual(
    formatSessionWindow('2026-10-29T15:30:00Z', '2026-10-30T00:30:00Z'),
    { date: 'Thu, 29 Oct 2026', time: '23:30–08:30 (ends 30 Oct)' },
  );
});

test('late-evening UTC that is already the next day in Kuala Lumpur uses that day', () => {
  assert.deepEqual(
    formatSessionWindow('2026-10-29T18:00:00Z', '2026-10-29T20:00:00Z'),
    { date: 'Fri, 30 Oct 2026', time: '02:00–04:00' },
  );
});

test('invalid input returns dashes and never throws', () => {
  assert.deepEqual(formatSessionWindow('not-a-date', '2026-10-29T03:00:00Z'), {
    date: '—',
    time: '—',
  });
  assert.deepEqual(formatSessionWindow(undefined, undefined), {
    date: '—',
    time: '—',
  });
  assert.equal(formatDate('nope'), '—');
  assert.equal(formatDate(null), '—');
});

test('availability map covers the four values and falls back to the raw string', () => {
  assert.deepEqual(statusFor('upcoming'), {
    label: 'Upcoming',
    modifier: 'upcoming',
  });
  assert.deepEqual(statusFor('in_progress'), {
    label: 'In progress',
    modifier: 'live',
  });
  assert.deepEqual(statusFor('ended'), { label: 'Ended', modifier: 'closed' });
  assert.deepEqual(statusFor('cancelled'), {
    label: 'Cancelled',
    modifier: 'closed',
  });
  assert.deepEqual(Object.keys(AVAILABILITY_STATUS).sort(), [
    'cancelled',
    'ended',
    'in_progress',
    'upcoming',
  ]);
  assert.deepEqual(statusFor('archived'), {
    label: 'archived',
    modifier: 'closed',
  });
  assert.deepEqual(statusFor('constructor'), {
    label: 'constructor',
    modifier: 'closed',
  });
});
