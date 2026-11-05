import { ApiError } from '../../../shared/services/api-client.js';
import { buildClassRosterPath } from './class-roster-query.js';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createClassRosterService({ api }) {
  return {
    async listClassRoster(classId, params, { signal } = {}) {
      const payload = await api.request(buildClassRosterPath(classId, params), {
        signal,
      });
      if (
        !isObject(payload) ||
        !Array.isArray(payload.data) ||
        !isObject(payload.context) ||
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
