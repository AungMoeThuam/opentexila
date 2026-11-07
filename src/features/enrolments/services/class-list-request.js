import { ApiError } from '../../../shared/services/api-client.js';

// Both role adapters use the same endpoint and response contract.
export function createClassListRequest({ api, buildPath }) {
  return async (params = {}, { signal } = {}) => {
    const payload = await api.request(buildPath(params), { signal });
    if (
      !Array.isArray(payload?.data) ||
      !payload?.meta ||
      Array.isArray(payload.meta) ||
      !Number.isInteger(payload.meta.totalPages) ||
      payload.meta.totalPages < 0
    ) {
      throw new ApiError('The server returned an unexpected class list.', {
        code: 'INVALID_RESPONSE',
      });
    }
    return payload;
  };
}
