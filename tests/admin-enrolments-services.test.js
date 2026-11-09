import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminClassesPath } from '../src/features/enrolments/services/admin-class-list-query.js';
import { createAdminClassesService } from '../src/features/enrolments/services/admin-classes-service.js';
import {
  createEnrolmentsManagementService,
  validateStudentId,
} from '../src/features/enrolments/services/enrolments-management-service.js';

test('admin classes query validates filters and encodes URL', () => {
  assert.equal(
    buildAdminClassesPath({ page: 2, limit: 20, courseId: 3, term: '2026-S2' }),
    '/classes?page=2&limit=20&courseId=3&term=2026-S2',
  );
  assert.throws(() => buildAdminClassesPath({ page: 0 }), RangeError);
  assert.throws(() => buildAdminClassesPath({ limit: 101 }), RangeError);
  assert.throws(() => buildAdminClassesPath({ courseId: 'xyz' }), RangeError);
  assert.throws(
    () => buildAdminClassesPath({ term: 'a'.repeat(51) }),
    RangeError,
  );
});

test('admin class service uses shared API client and validates response', async () => {
  const requests = [];
  const service = createAdminClassesService({
    api: {
      request: async (path, options) => {
        requests.push([path, options]);
        return {
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      },
    },
  });
  const signal = new AbortController().signal;
  await service.list({ page: 1 }, { signal });
  assert.equal(requests[0][0], '/classes?page=1');
  assert.equal(requests[0][1].signal, signal);
});

test('student ID validation rejects invalid input', () => {
  assert.equal(validateStudentId('3'), 3);
  for (const invalid of ['', '0', '-2', '2.5', 'abc', '9007199254740992']) {
    assert.throws(() => validateStudentId(invalid), RangeError);
  }
});

test('admin enrolment mutations use exact paths and methods', async () => {
  const requests = [];
  const service = createEnrolmentsManagementService({
    api: {
      request: async (path, options) => {
        requests.push([path, options]);
        return options.method === 'POST'
          ? { data: { class_id: 7, student_id: 3 } }
          : null;
      },
    },
  });
  await service.addStudent('7', '3');
  await service.removeStudent('7', 3);
  assert.equal(requests[0][0], '/classes/7/enrolments');
  assert.equal(requests[0][1].method, 'POST');
  assert.deepEqual(requests[0][1].body, { student_id: 3 });
  assert.equal(requests[1][0], '/classes/7/enrolments/3');
  assert.equal(requests[1][1].method, 'DELETE');
  assert.throws(() => validateStudentId('no'), RangeError);
});
