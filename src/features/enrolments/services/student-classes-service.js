import { ApiError } from '../../../shared/services/api-client.js';
import { buildStudentClassesPath } from './student-classes-query.js';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createStudentClassesService({ api }) {
  return {
    async listEnrolledClasses(params = {}, { signal } = {}) {
      const path = buildStudentClassesPath(params);
      const payload = await api.request(path, { signal });
      if (
        !isObject(payload) ||
        !Array.isArray(payload.data) ||
        !isObject(payload.meta)
      ) {
        throw new ApiError('The server returned an unexpected response.', {
          code: 'INVALID_RESPONSE',
        });
      }
      return payload;
    },
  };
}
