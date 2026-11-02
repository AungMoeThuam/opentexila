import { ApiError } from '../../../shared/services/api-client.js';
import { buildClassSessionsPath } from './class-session-query.js';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createClassSessionsService({ api }) {
  return {
    async listMyClassSessions(params, { signal } = {}) {
      const payload = await api.request(buildClassSessionsPath(params), {
        signal,
      });
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
