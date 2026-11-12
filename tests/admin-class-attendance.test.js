import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attendanceLine,
  canViewRoster,
  classIdFromQuery,
  classOptionLabel,
  needsFinalising,
} from '../src/features/attendance/services/admin-class-attendance.js';
import attendanceRoutes from '../src/features/attendance/routes.js';
import { navigationForRole } from '../src/layouts/navigation.js';

const session = (availability, over = {}) => ({
  id: 1,
  state: availability === 'cancelled' ? 'cancelled' : 'scheduled',
  availability,
  attendance: { present: 5, late: 1, absent: 0, pending: 0 },
  ...over,
});

test('class options read "code · section · term"', () => {
  assert.equal(
    classOptionLabel({
      course: { code: 'COS30043' },
      section: 'A',
      term: '2026-S2',
    }),
    'COS30043 · Section A · 2026-S2',
  );
  assert.equal(classOptionLabel({ course: { code: 'X' }, term: 'T' }), 'X · T');
  assert.equal(classOptionLabel(null), '');
});

test('only a session that has started has a roster to view', () => {
  assert.equal(canViewRoster(session('upcoming')), false);
  for (const availability of ['in_progress', 'ended', 'cancelled'])
    assert.equal(canViewRoster(session(availability)), true, availability);
});

test('the counts line shows every status, also when zero', () => {
  assert.equal(
    attendanceLine({ present: 10, late: 2, absent: 1, pending: 0 }),
    'Present 10 · Late 2 · Absent 1 · Pending 0',
  );
  assert.equal(
    attendanceLine(undefined),
    'Present 0 · Late 0 · Absent 0 · Pending 0',
  );
});

test('an ended session with pending students needs finalising', () => {
  const pending = { present: 3, late: 0, absent: 0, pending: 2 };
  assert.equal(
    needsFinalising(session('ended', { attendance: pending })),
    true,
  );
  assert.equal(needsFinalising(session('ended')), false);
  assert.equal(
    needsFinalising(session('in_progress', { attendance: pending })),
    false,
  );
  assert.equal(
    needsFinalising(session('cancelled', { attendance: pending })),
    false,
  );
  assert.equal(needsFinalising(undefined), false);
});

test('the class in the address must be a real class ID', () => {
  assert.equal(classIdFromQuery('7'), '7');
  assert.equal(classIdFromQuery(['7', '8']), '7');
  for (const bad of [
    undefined,
    '',
    '0',
    '-1',
    '1.5',
    'abc',
    '7abc',
    '4294967296',
    null,
  ])
    assert.equal(classIdFromQuery(bad), '', String(bad));
});

test('admin attendance routes are admin-only and the menu keeps its link', () => {
  const find = (name) => attendanceRoutes.find((route) => route.name === name);
  assert.equal(find('class-attendance').path, 'attendance/classes');
  assert.equal(
    find('admin-class-session-records').path,
    'attendance/class-sessions/:classSessionId(\\d+)',
  );
  for (const name of ['class-attendance', 'admin-class-session-records'])
    assert.deepEqual(find(name).meta.roles, ['admin'], name);
  // The lecturer's roster route is unchanged.
  assert.deepEqual(find('lecturer-class-session-records').meta.roles, [
    'lecturer',
  ]);
  assert.ok(
    navigationForRole('admin').some(
      (item) => item.to === '/attendance/classes',
    ),
  );
});
