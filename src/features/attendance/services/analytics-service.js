import { buildAnalyticsPath } from './analytics-query.js';

export function createAnalyticsService({ api }) {
  return {
    getAttendanceAnalytics(filters, { signal } = {}) {
      return api.request(buildAnalyticsPath(filters), { signal });
    },
    // Lecturer-only. The shared client adds the CSRF token to POST requests.
    async finaliseClassSession(classSessionId) {
      const payload = await api.request(
        `/class-sessions/${Number(classSessionId)}/finalise`,
        { method: 'POST' },
      );
      const result = payload?.data ?? payload ?? {};
      return {
        outcome: result.outcome,
        absentMarked: result.absentMarked ?? result.absent_marked ?? 0,
      };
    },
  };
}
