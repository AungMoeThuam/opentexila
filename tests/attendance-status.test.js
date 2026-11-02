import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENDANCE_STATUS,
  statusFor,
} from '../src/features/attendance/components/attendance-status.js';

test('known attendance statuses map to labels and status modifiers', () => {
  assert.deepEqual(statusFor('present'), {
    label: 'Present',
    modifier: 'present',
  });
  assert.deepEqual(statusFor('late'), { label: 'Late', modifier: 'late' });
  assert.deepEqual(statusFor('pending'), {
    label: 'Pending',
    modifier: 'pending',
  });
  assert.deepEqual(statusFor('absent'), {
    label: 'Absent',
    modifier: 'absent',
  });
  assert.deepEqual(Object.keys(ATTENDANCE_STATUS).sort(), [
    'absent',
    'late',
    'pending',
    'present',
  ]);
});

test('unknown attendance statuses fall back to the raw string as pending', () => {
  assert.deepEqual(statusFor('excused'), {
    label: 'excused',
    modifier: 'pending',
  });
  assert.deepEqual(statusFor(undefined), { label: '', modifier: 'pending' });
  assert.deepEqual(statusFor('constructor'), {
    label: 'constructor',
    modifier: 'pending',
  });
});
