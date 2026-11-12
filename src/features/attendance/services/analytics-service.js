import { buildAnalyticsPath } from './analytics-query.js';

export function createAnalyticsService({ api }) {
  return {
    getAttendanceAnalytics(filters, { signal } = {}) {
      return api.request(buildAnalyticsPath(filters), { signal });
    },
  };
}
