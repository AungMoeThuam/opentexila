import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { useAttendanceAnalytics } from '../src/features/attendance/composables/use-attendance-analytics.js';

const NOW = new Date('2026-11-11T18:00:00Z');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const payload = (sessions = 12) => ({
  data: {
    summary: {
      sessions,
      present: sessions ? 180 : 0,
      late: 0,
      absent: 0,
      attendanceRate: 0,
      atRiskCount: 0,
    },
    trend: sessions
      ? [{ date: '2026-10-06', present: 1, late: 0, absent: 0 }]
      : [],
    byClass: [],
    atRisk: [],
  },
  meta: { from: '2026-10-01', to: '2026-10-31', atRiskBelow: 75 },
});

function fakeService(handler = async () => payload()) {
  const calls = [];
  return {
    calls,
    finalised: [],
    async finaliseClassSession(id) {
      this.finalised.push(id);
      if (this.finaliseError) throw this.finaliseError;
      return { outcome: 'finalised', absentMarked: 2 };
    },
    getAttendanceAnalytics(filters, options) {
      calls.push({ filters: { ...filters }, signal: options.signal });
      return handler(filters, options, calls.length);
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(options = {}) {
  const service = options.service ?? fakeService();
  const changes = [];
  const analytics = useAttendanceAnalytics({
    service,
    now: () => NOW,
    onFiltersChange: (filters) => changes.push({ ...filters }),
    ...options,
    service,
  });
  return { service, changes, analytics };
}

test('initial filters come from the query and notices explain fallbacks', () => {
  const { analytics } = setup({
    initialQuery: { classId: '7', atRiskBelow: '20' },
  });
  assert.equal(analytics.filters.classId, '7');
  assert.equal(analytics.filters.atRiskBelow, 75);
  assert.equal(analytics.notices.value.length, 1);
});

test('load fetches immediately with the current filters', async () => {
  const { service, analytics } = setup();
  await analytics.load();
  assert.equal(service.calls.length, 1);
  assert.deepEqual(service.calls[0].filters, {
    classId: '',
    from: '2026-10-14',
    to: '2026-11-12',
    atRiskBelow: 75,
  });
  assert.equal(analytics.data.value.summary.sessions, 12);
  assert.equal(analytics.loading.value, false);
});

test('rapid filter changes send one request after 300 ms', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { service, changes, analytics } = setup();
  analytics.updateFilters({ classId: '1' });
  t.mock.timers.tick(200);
  analytics.updateFilters({ classId: '2' });
  t.mock.timers.tick(299);
  assert.equal(service.calls.length, 0);
  t.mock.timers.tick(1);
  assert.equal(service.calls.length, 1);
  assert.equal(service.calls[0].filters.classId, '2');
  assert.equal(changes.at(-1).classId, '2');
});

test('an invalid range sends no request and keeps earlier data', async (t) => {
  const { service, analytics } = setup();
  await analytics.load();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  analytics.updateFilters({ from: '2026-12-01', to: '2026-11-01' });
  t.mock.timers.tick(1000);
  assert.equal(service.calls.length, 1);
  assert.match(analytics.filterErrors.value.from, /on or before/);
  assert.equal(analytics.data.value.summary.sessions, 12);
});

test('fixing an invalid filter clears the error and loads again', async (t) => {
  const { service, analytics } = setup();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  analytics.updateFilters({ atRiskBelow: 60 });
  assert.ok(analytics.filterErrors.value.atRiskBelow);
  analytics.updateFilters({ atRiskBelow: 90 });
  assert.equal(analytics.filterErrors.value, null);
  t.mock.timers.tick(300);
  assert.equal(service.calls.length, 1);
  assert.equal(service.calls[0].filters.atRiskBelow, 90);
});

test('an older response never replaces a newer one', async () => {
  const first = deferred();
  const second = deferred();
  const service = fakeService((filters, options, n) =>
    n === 1 ? first.promise : second.promise,
  );
  const { analytics } = setup({ service });
  const a = analytics.load();
  const b = analytics.load();
  assert.equal(service.calls[0].signal.aborted, true);
  second.resolve(payload(5));
  await b;
  first.resolve(payload(99));
  await a;
  await flush();
  assert.equal(analytics.data.value.summary.sessions, 5);
  assert.equal(analytics.loading.value, false);
});

test('a server error is kept with the filters and retry loads again', async () => {
  let fail = true;
  const service = fakeService(async () => {
    if (fail)
      throw new ApiError('The server is not available.', { status: 500 });
    return payload();
  });
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.error.value.status, 500);
  assert.equal(analytics.filters.from, '2026-10-14');
  fail = false;
  await analytics.retry();
  assert.equal(analytics.error.value, null);
  assert.equal(analytics.data.value.summary.sessions, 12);
});

test('an aborted request is not reported as an error', async () => {
  const service = fakeService(async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    throw abort;
  });
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.error.value, null);
});

test('no sessions in range is reported as empty, not an error', async () => {
  const service = fakeService(async () => payload(0));
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.isEmpty.value, true);
  assert.equal(analytics.error.value, null);
});

test('a malformed response becomes an error', async () => {
  const service = fakeService(async () => ({ nothing: true }));
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.error.value.code, 'INVALID_RESPONSE');
});

test('changing only the threshold fetches again with it', async (t) => {
  const { service, analytics } = setup();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  analytics.updateFilters({ atRiskBelow: 85 });
  t.mock.timers.tick(300);
  assert.equal(service.calls[0].filters.atRiskBelow, 85);
});

test('a 422 shows each server message under its own filter, not as a page error', async () => {
  const service = fakeService(async () => {
    throw new ApiError('Invalid', {
      status: 422,
      code: 'VALIDATION_ERROR',
      fields: { from: 'Start is too far back.' },
    });
  });
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.filterErrors.value.from, 'Start is too far back.');
  assert.equal(analytics.error.value, null);
});

test('dispose cancels the pending timer and the in-flight request', async (t) => {
  const pending = deferred();
  const service = fakeService(() => pending.promise);
  const { analytics } = setup({ service });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const running = analytics.load();
  analytics.updateFilters({ classId: '3' });
  analytics.dispose();
  t.mock.timers.tick(1000);
  assert.equal(service.calls.length, 1);
  assert.equal(service.calls[0].signal.aborted, true);
  pending.resolve(payload());
  await running;
  assert.equal(analytics.data.value, null);
});

const withUnfinalised = (sessions) => {
  const result = payload(0);
  result.data.unfinalised = sessions;
  result.data.summary.unfinalisedSessions = sessions.length;
  return result;
};

test('a range with only unfinalised sessions is not reported as empty', async () => {
  const service = fakeService(async () =>
    withUnfinalised([{ classSessionId: 30, classId: 7, pendingCount: 2 }]),
  );
  const { analytics } = setup({ service });
  await analytics.load();
  assert.equal(analytics.isEmpty.value, false);
  assert.equal(analytics.data.value.unfinalised.length, 1);
});

test('a response without the unfinalised list is accepted as having none', async () => {
  const { analytics } = setup();
  await analytics.load();
  assert.deepEqual(analytics.data.value.unfinalised, []);
});

test('finalising calls the service, then reloads the analytics', async () => {
  const { service, analytics } = setup();
  await analytics.load();
  await analytics.finalise(30);
  assert.deepEqual(service.finalised, [30]);
  assert.equal(service.calls.length, 2);
  assert.equal(analytics.finalisingId.value, null);
  assert.equal(analytics.finaliseError.value, null);
});

test('a finalise outcome other than finalised is explained, not hidden', async () => {
  const { service, analytics } = setup();
  service.finaliseClassSession = async () => ({
    outcome: 'not_due',
    absentMarked: 0,
  });
  await analytics.finalise(30);
  assert.match(analytics.finaliseError.value, /not.*finalised|has not ended/i);
});

test('a finalise failure is reported and keeps the data on screen', async () => {
  const { service, analytics } = setup();
  await analytics.load();
  service.finaliseError = new ApiError('Not allowed.', { status: 403 });
  await analytics.finalise(30);
  assert.equal(analytics.finaliseError.value, 'Not allowed.');
  assert.equal(analytics.finalisingId.value, null);
  assert.equal(analytics.data.value.summary.sessions, 12);
  assert.equal(service.calls.length, 1);
});
