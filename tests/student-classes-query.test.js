import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStudentClassesPath,
  validateCourseId,
} from '../src/features/enrolments/services/student-classes-query.js';

test('buildStudentClassesPath builds base /me/classes path when no params provided', () => {
  assert.equal(buildStudentClassesPath(), '/me/classes');
  assert.equal(buildStudentClassesPath({}), '/me/classes');
});

test('buildStudentClassesPath includes page, limit, courseId, and term', () => {
  const path = buildStudentClassesPath({
    page: 2,
    limit: 15,
    courseId: 101,
    term: '2026-S2',
  });

  const url = new URL(path, 'http://localhost');
  assert.equal(url.pathname, '/me/classes');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('limit'), '15');
  assert.equal(url.searchParams.get('courseId'), '101');
  assert.equal(url.searchParams.get('term'), '2026-S2');
});

test('buildStudentClassesPath ignores blank or empty filters', () => {
  const path = buildStudentClassesPath({
    page: 1,
    limit: '',
    courseId: null,
    term: '   ',
  });

  const url = new URL(path, 'http://localhost');
  assert.equal(url.pathname, '/me/classes');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.has('limit'), false);
  assert.equal(url.searchParams.has('courseId'), false);
  assert.equal(url.searchParams.has('term'), false);
});

test('buildStudentClassesPath rejects invalid page ranges', () => {
  for (const bad of [0, -1, 10001, 1.5, 'abc', '1e2']) {
    assert.throws(
      () => buildStudentClassesPath({ page: bad }),
      RangeError,
      `Expected page ${bad} to throw RangeError`,
    );
  }
});

test('buildStudentClassesPath rejects invalid limit ranges', () => {
  for (const bad of [0, -5, 101, 2.5, 'xyz']) {
    assert.throws(
      () => buildStudentClassesPath({ limit: bad }),
      RangeError,
      `Expected limit ${bad} to throw RangeError`,
    );
  }
});

test('buildStudentClassesPath rejects invalid courseId', () => {
  for (const bad of [0, -1, 1.5, 'bad', ' 2a']) {
    assert.throws(
      () => buildStudentClassesPath({ courseId: bad }),
      RangeError,
      `Expected courseId ${bad} to throw RangeError`,
    );
  }
});

test('validateCourseId accepts empty or whitespace inputs without errors', () => {
  for (const empty of [undefined, null, '', '   ']) {
    const result = validateCourseId(empty);
    assert.equal(result.valid, true);
    assert.equal(result.value, undefined);
  }
});

test('validateCourseId accepts numeric and string positive integers', () => {
  // Numeric inputs (e.g. from v-model.number)
  assert.deepEqual(validateCourseId(1), { valid: true, value: 1 });
  assert.deepEqual(validateCourseId(101), { valid: true, value: 101 });

  // String inputs (e.g. from text inputs)
  assert.deepEqual(validateCourseId('1'), { valid: true, value: 1 });
  assert.deepEqual(validateCourseId(' 101 '), { valid: true, value: 101 });
});

test('validateCourseId rejects zero, negatives, decimals, and non-numeric strings', () => {
  for (const bad of [0, '0', -1, '-5', 1.5, '1.5', 'COS30043', 'abc', NaN]) {
    const result = validateCourseId(bad);
    assert.equal(
      result.valid,
      false,
      `Expected ${bad} to fail courseId validation`,
    );
    assert.ok(result.error && typeof result.error === 'string');
  }
});
