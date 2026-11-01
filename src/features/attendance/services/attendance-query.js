export function buildPersonalAttendanceQuery(params = {}) {
  const query = new URLSearchParams();

  if (params.page !== undefined && params.page !== null) {
    query.set('page', String(params.page));
  }

  if (params.limit !== undefined && params.limit !== null) {
    query.set('limit', String(params.limit));
  }

  if (
    params.classId !== undefined &&
    params.classId !== null &&
    params.classId !== ''
  ) {
    query.set('classId', String(params.classId));
  }

  if (params.from) {
    query.set('from', params.from);
  }

  if (params.to) {
    query.set('to', params.to);
  }

  if (params.status) {
    query.set('status', params.status);
  }

  if (
    params.includeCancelled !== undefined &&
    params.includeCancelled !== null
  ) {
    query.set('includeCancelled', String(params.includeCancelled));
  }

  const queryString = query.toString();

  return queryString
    ? `/me/attendance-records?${queryString}`
    : '/me/attendance-records';
}
