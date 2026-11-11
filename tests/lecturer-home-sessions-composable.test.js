import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/services/api-client.js';
import { useLecturerHomeSessions } from '../src/features/dashboard/composables/use-lecturer-home-sessions.js';

const NOW = new Date('2026-03-02T04:00:00.000Z'); // 12:00 KL

const session = (id, startsAt) => ({
  id,
  starts_at: startsAt,
  ends_at: startsAt,
  availability: 'upcoming',
});

const serviceReturning = (data) => {
  const calls = [];
  return {
    calls,
    async listMyClassSessions(params, options) {
      calls.push({ params, options });
      return { data, meta: { page: 1, limit: 10, total: data.length } };
    },
  };
};

test('loads the next 7 days with a limit of 10 and groups the result', async () => {
  const service = serviceReturning([
    session(2, '2026-03-03T01:00:00.000Z'),
    session(1, '2026-03-02T07:00:00.000Z'),
  ]);
  const home = useLecturerHomeSessions({ service, now: () => NOW });
  assert.equal(home.state.value, 'loading');

  await home.load();

  assert.deepEqual(service.calls[0].params, {
    from: '2026-03-01T16:00:00.000Z',
    to: '2026-03-09T16:00:00.000Z',
    limit: 10,
  });
  assert.equal(home.state.value, 'success');
  assert.deepEqual(
    home.groups.value.today.map((s) => s.id),
    [1],
  );
  assert.deepEqual(
    home.groups.value.upcoming.map((s) => s.id),
    [2],
  );
});

test('reports empty when the lecturer has no sessions in the window', async () => {
  const home = useLecturerHomeSessions({
    service: serviceReturning([]),
    now: () => NOW,
  });
  await home.load();
  assert.equal(home.state.value, 'empty');
});

test('reports error, then recovers when retried', async () => {
  let fail = true;
  const service = {
    async listMyClassSessions() {
      if (fail) throw new ApiError('Server down', { code: 'SERVER_ERROR' });
      return {
        data: [session(1, '2026-03-02T07:00:00.000Z')],
        meta: { page: 1, limit: 10, total: 1 },
      };
    },
  };
  const home = useLecturerHomeSessions({ service, now: () => NOW });

  await home.load();
  assert.equal(home.state.value, 'error');
  assert.equal(home.error.value.message, 'Server down');

  fail = false;
  await home.retry();
  assert.equal(home.state.value, 'success');
  assert.equal(home.error.value, null);
});

test('ignores a stale response that resolves after a newer request', async () => {
  const resolvers = [];
  const service = {
    listMyClassSessions: () =>
      new Promise((resolve) => resolvers.push(resolve)),
  };
  const home = useLecturerHomeSessions({ service, now: () => NOW });

  const first = home.load();
  const second = home.retry();
  const page = (id) => ({
    data: [session(id, '2026-03-02T07:00:00.000Z')],
    meta: {},
  });
  resolvers[1](page(2));
  await second;
  resolvers[0](page(1));
  await first;

  assert.deepEqual(
    home.groups.value.today.map((s) => s.id),
    [2],
  );
});
