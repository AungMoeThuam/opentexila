import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { createAnalyticsService } from '../src/features/attendance/services/analytics-service.js';
import { createMockAnalyticsService } from '../src/features/attendance/services/mock-analytics.js';

const FILTERS = {
  classId: '',
  from: '2026-09-01',
  to: '2026-11-30',
  atRiskBelow: 75,
};

test('real service requests the built path and returns the payload', async () => {
  const requests = [];
  const body = { data: {}, meta: {} };
  const service = createAnalyticsService({
    api: {
      async request(path, options) {
        requests.push({ path, options });
        return body;
      },
    },
  });
  const signal = new AbortController().signal;
  const result = await service.getAttendanceAnalytics(
    { ...FILTERS, classId: '7' },
    { signal },
  );
  assert.equal(result, body);
  assert.equal(
    requests[0].path,
    '/lecturer/attendance-analytics?classId=7&from=2026-09-01&to=2026-11-30&atRiskBelow=75',
  );
  assert.equal(requests[0].options.signal, signal);
});

test('real service lets API errors through unchanged', async () => {
  const failure = new ApiError('nope', { status: 403, code: 'FORBIDDEN' });
  const service = createAnalyticsService({
    api: {
      async request() {
        throw failure;
      },
    },
  });
  await assert.rejects(service.getAttendanceAnalytics(FILTERS, {}), failure);
});

test('mock totals agree with the sum of its trend and class rows', async () => {
  const { data } = await createMockAnalyticsService().getAttendanceAnalytics(
    FILTERS,
    {},
  );
  for (const key of ['present', 'late', 'absent']) {
    const fromTrend = data.trend.reduce((t, row) => t + row[key], 0);
    const fromClasses = data.byClass.reduce((t, row) => t + row[key], 0);
    assert.equal(data.summary[key], fromTrend);
    assert.equal(data.summary[key], fromClasses);
  }
  const { present, late, absent, attendanceRate } = data.summary;
  assert.equal(
    attendanceRate,
    Math.round(((present + late) / (present + late + absent)) * 1000) / 10,
  );
});

test('mock at-risk list is below threshold, lowest rate first, ties by name', async () => {
  const { data } = await createMockAnalyticsService().getAttendanceAnalytics(
    FILTERS,
    {},
  );
  assert.ok(data.atRisk.length > 1);
  assert.ok(data.atRisk.every((row) => row.attendanceRate < 75));
  for (let i = 1; i < data.atRisk.length; i += 1) {
    const [a, b] = [data.atRisk[i - 1], data.atRisk[i]];
    assert.ok(
      a.attendanceRate < b.attendanceRate ||
        (a.attendanceRate === b.attendanceRate && a.name <= b.name),
    );
  }
  assert.equal(data.summary.atRiskCount, data.atRisk.length);
});

test('mock treats exactly 75% as not at risk and a higher threshold as at risk', async () => {
  const service = createMockAnalyticsService();
  const base = await service.getAttendanceAnalytics(FILTERS, {});
  assert.equal(
    base.data.atRisk.some((row) => row.attendanceRate === 75),
    false,
  );
  const strict = await service.getAttendanceAnalytics(
    { ...FILTERS, atRiskBelow: 100 },
    {},
  );
  assert.ok(strict.data.atRisk.some((row) => row.attendanceRate === 75));
  assert.ok(strict.data.atRisk.length > base.data.atRisk.length);
});

test('mock lists a student twice when at risk in two classes', async () => {
  const { data } = await createMockAnalyticsService().getAttendanceAnalytics(
    FILTERS,
    {},
  );
  const counts = new Map();
  for (const row of data.atRisk) {
    counts.set(row.studentId, (counts.get(row.studentId) ?? 0) + 1);
  }
  assert.ok([...counts.values()].some((n) => n === 2));
});

test('mock class filter narrows every part of the response', async () => {
  const { data } = await createMockAnalyticsService().getAttendanceAnalytics(
    { ...FILTERS, classId: '1' },
    {},
  );
  assert.deepEqual(
    data.byClass.map((row) => row.classId),
    [1],
  );
  assert.ok(data.atRisk.every((row) => row.classId === 1));
});

test('mock empty range returns zero counts and empty lists', async () => {
  const { data } = await createMockAnalyticsService().getAttendanceAnalytics(
    { ...FILTERS, from: '2025-01-01', to: '2025-01-31' },
    {},
  );
  assert.equal(data.summary.sessions, 0);
  assert.deepEqual([data.trend, data.byClass, data.atRisk], [[], [], []]);
});

test('mock leaves out a student with no ended session in the range', async () => {
  const service = createMockAnalyticsService();
  const wide = await service.getAttendanceAnalytics(FILTERS, {});
  const late = await service.getAttendanceAnalytics(
    { ...FILTERS, from: '2026-11-01' },
    {},
  );
  const ids = (result) => new Set(result.data.atRisk.map((r) => r.studentId));
  assert.ok([...ids(wide)].some((id) => !ids(late).has(id)));
});

test('mock rejects an unknown class with a forbidden error', async () => {
  await assert.rejects(
    createMockAnalyticsService().getAttendanceAnalytics(
      { ...FILTERS, classId: '999' },
      {},
    ),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  );
});
