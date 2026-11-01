import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAttendanceService,
  readLocation,
  errorMessage,
  formatDate,
} from '../src/features/attendance/services/attendance.js';
import { createApiClient } from '../src/shared/services/api-client.js';
import routes from '../src/features/attendance/routes.js';
import { createAccessGuard } from '../src/router/access.js';

test('location uses a single fresh high-accuracy reading and the browser timestamp', async () => {
  let calls = 0;
  const reading = await readLocation({
    getCurrentPosition(success, failure, options) {
      calls++;
      assert.deepEqual(options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      });
      success({
        coords: { latitude: 3.139, longitude: 101.6869, accuracy: 12 },
        timestamp: 1793235898000,
      });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(reading, {
    latitude: 3.139,
    longitude: 101.6869,
    accuracy_m: 12,
    reading_timestamp: new Date(1793235898000).toISOString(),
  });
});
for (const [code, expected] of [
  [1, 'LOCATION_DENIED'],
  [2, 'LOCATION_UNAVAILABLE'],
  [3, 'LOCATION_TIMEOUT'],
]) {
  test(`location error ${code} gives actionable feedback`, async () => {
    await assert.rejects(
      readLocation({
        getCurrentPosition(success, failure) {
          failure({ code });
        },
      }),
      (error) => error.code === expected && errorMessage(error).length > 20,
    );
  });
}
test('unsupported geolocation is handled', async () => {
  await assert.rejects(
    readLocation(null),
    (error) => error.code === 'LOCATION_UNSUPPORTED',
  );
});
for (const status of ['present', 'late']) {
  test(`${status} check-in uses the shared cookie and CSRF client and retains confirmation`, async () => {
    const requests = [];
    const record = { status, checked_in_at: '2026-10-29T01:05:00.000Z' };
    const api = createApiClient({
      fetcher: async (url, options) => {
        requests.push({ url, ...options });
        return new Response(
          JSON.stringify(
            url.endsWith('/auth/csrf')
              ? { data: { csrfToken: 'test-token' } }
              : { data: { attendance_record: record } },
          ),
        );
      },
    });
    const body = {
      latitude: 3,
      longitude: 101,
      accuracy_m: 5,
      reading_timestamp: '2026-10-29T01:04:58.000Z',
    };
    const result = await createAttendanceService(api).checkIn(30, body);
    assert.deepEqual(result.data.attendance_record, record);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, '/api/v1/class-sessions/30/check-ins');
    assert.equal(requests[1].credentials, 'include');
    assert.equal(requests[1].headers['X-CSRF-Token'], 'test-token');
    assert.equal(requests[1].method, 'POST');
    assert.deepEqual(JSON.parse(requests[1].body), body);
  });
}
test('list pagination and detail propagate cancellation', async () => {
  const calls = [];
  const service = createAttendanceService({
    request: (...args) => {
      calls.push(args);
      return Promise.resolve({ data: [] });
    },
  });
  const signal = new AbortController().signal;
  await service.list(2, signal);
  await service.detail(30, signal);
  assert.deepEqual(calls, [
    ['/me/class-sessions?page=2&limit=20', { signal }],
    ['/class-sessions/30', { signal }],
  ]);
});
test('API check-in failures are surfaced without automatic replay', async () => {
  let posts = 0;
  const api = createApiClient({
    fetcher: async (url) => {
      if (url.endsWith('/auth/csrf'))
        return new Response(JSON.stringify({ data: { csrfToken: 'token' } }));
      posts++;
      return new Response(
        JSON.stringify({ error: { code: 'LOCATION_STALE', message: 'Stale' } }),
        { status: 422 },
      );
    },
  });
  await assert.rejects(
    createAttendanceService(api).checkIn(30, {}),
    (error) =>
      error.code === 'LOCATION_STALE' &&
      errorMessage(error).includes('fresh reading'),
  );
  assert.equal(posts, 1);
});
test('all eligibility and required location errors have specific messages', () => {
  for (const code of [
    'LOCATION_INACCURATE',
    'OUTSIDE_ALLOWED_AREA',
    'LOCATION_STALE',
    'NOT_STARTED',
    'CLASS_NOT_STARTED',
    'CLASS_ENDED',
    'CLASS_CANCELLED',
    'ALREADY_CHECKED_IN',
    'NOT_ELIGIBLE',
    'ROLE_NOT_STUDENT',
  ]) {
    assert.notEqual(
      errorMessage({ code }),
      'The request failed. Please try again.',
    );
  }
  assert.equal(formatDate(null), 'Not recorded');
});
test('student routes enforce roles and old session links retain the resource ID', async () => {
  for (const name of ['student-attendance', 'student-class-session-check-in']) {
    const route = routes.find((entry) => entry.name === name);
    const guard = createAccessGuard({
      restore: async () => {},
      state: { status: 'authenticated', user: { role: 'teacher' } },
    });
    assert.deepEqual(
      await guard({ meta: { requiresAuth: true, ...route.meta } }),
      { name: 'forbidden' },
    );
  }
  assert.deepEqual(
    routes
      .find((route) => route.name === 'check-in')
      .redirect({ params: { meetingId: '30' } }),
    {
      name: 'student-class-session-check-in',
      params: { classSessionId: '30' },
    },
  );
});
