import { api as sharedApi } from '../../../app-context';
import { buildPersonalAttendanceQuery } from './attendance-query.js';

export { buildPersonalAttendanceQuery } from './attendance-query.js';

export async function fetchPersonalAttendanceRecords(
  params = {},
  options = {},
  customApi = null,
) {
  const endpoint = buildPersonalAttendanceQuery(params);
  const client = customApi || sharedApi;

  return client.request(endpoint, {
    method: 'GET',
    signal: options.signal,
  });
}
