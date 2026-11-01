import { test } from 'node:test';
import assert from 'node:assert/strict';

import { navigationForRole } from '../src/layouts/navigation.js';
import { buildPersonalAttendanceQuery } from '../src/features/attendance/services/attendance-query.js';

test('Attendance service builds correct query parameters', () => {
  const path = buildPersonalAttendanceQuery({
    page: 2,
    limit: 15,
    classId: 1,
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-31T23:59:59.000Z',
    status: 'present',
    includeCancelled: true,
  });

  const url = new URL(path, 'http://localhost');

  assert.equal(url.pathname, '/me/attendance-records');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('limit'), '15');
  assert.equal(url.searchParams.get('classId'), '1');
  assert.equal(url.searchParams.get('from'), '2026-10-01T00:00:00.000Z');
  assert.equal(url.searchParams.get('to'), '2026-10-31T23:59:59.000Z');
  assert.equal(url.searchParams.get('status'), 'present');
  assert.equal(url.searchParams.get('includeCancelled'), 'true');
});

test('Attendance query handles empty and false filters', () => {
  assert.equal(buildPersonalAttendanceQuery(), '/me/attendance-records');

  const path = buildPersonalAttendanceQuery({
    page: 1,
    limit: 20,
    classId: '',
    includeCancelled: false,
  });

  const url = new URL(path, 'http://localhost');

  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('limit'), '20');
  assert.equal(url.searchParams.has('classId'), false);
  assert.equal(url.searchParams.get('includeCancelled'), 'false');
});

test('Attendance history appears in student navigation', () => {
  const studentNav = navigationForRole('student');

  const attendanceGroup = studentNav.find(
    (item) => item.label === 'Attendance',
  );

  assert.ok(attendanceGroup, 'Attendance group exists for student');

  assert.ok(
    attendanceGroup.children.some((item) => item.to === '/attendance/history'),
    'Student menu contains attendance history',
  );
});

test('Student attendance menu is hidden from teacher and admin', () => {
  for (const role of ['teacher', 'admin']) {
    const navigation = navigationForRole(role);

    const attendanceGroup = navigation.find(
      (item) => item.label === 'Attendance',
    );

    assert.equal(
      attendanceGroup,
      undefined,
      `Student attendance menu should not appear for ${role}`,
    );
  }
});
