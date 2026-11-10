import { api as sharedApi } from '../../../app-context';
import {
  buildPersonalAttendanceQuery,
  buildAttendanceClassOptionsQuery,
} from './attendance-query.js';

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

export async function fetchAttendanceClassOptions(
  params = {},
  options = {},
  customApi = null,
) {
  const client = customApi || sharedApi;

  return client.request(buildAttendanceClassOptionsQuery(params), {
    method: 'GET',
    signal: options.signal,
  });
}
