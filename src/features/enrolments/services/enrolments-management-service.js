import { ApiError } from '../../../shared/services/api-client.js';
import { buildClassRosterPath } from './class-roster-query.js';

export function validateStudentId(input) {
  const value = String(input ?? '').trim();
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new RangeError('Student ID must be a positive integer.');
  }
  return Number(value);
}

export function createEnrolmentsManagementService({ api }) {
  return {
    async addStudent(classId, studentId, { signal } = {}) {
      const id = validateStudentId(studentId);
      const payload = await api.request(buildClassRosterPath(classId), {
        method: 'POST',
        body: { student_id: id },
        signal,
      });
      if (!payload || typeof payload !== 'object' || !payload.data) {
        throw new ApiError('The server returned an unexpected response.', {
          code: 'INVALID_RESPONSE',
        });
      }
      return payload;
    },
    async removeStudent(classId, studentId, { signal } = {}) {
      const id = validateStudentId(studentId);
      // Validate the class ID using the same shared builder as the roster GET.
      const rosterPath = buildClassRosterPath(classId);
      return api.request(`${rosterPath}/${id}`, {
        method: 'DELETE',
        signal,
      });
    },
  };
}
