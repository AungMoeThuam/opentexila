import { ApiError } from '../../../shared/services/api-client.js';
import { buildClassSessionRecordsPath } from './class-session-records-query.js';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createClassSessionRecordsService({ api }) {
  return {
    async listClassSessionRecords(classSessionId, params, { signal } = {}) {
      const payload = await api.request(
        buildClassSessionRecordsPath(classSessionId, params),
        { signal },
      );
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
