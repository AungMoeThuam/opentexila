import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createApiClient,
  ApiError,
} from '../src/shared/services/api-client.js';
import { createAuth } from '../src/features/auth/store/create-auth.js';
import { createSessionAdapter } from '../src/features/auth/services/session-adapter.js';
import { createAccessGuard, safeRedirect } from '../src/router/access.js';
import { navigationForRole } from '../src/layouts/navigation.js';
import { createMockSession } from '../src/dev/mock-session.js';

const profile = {
  id: 1,
  name: 'Demo',
  email: 'demo@example.test',
  role: 'student',
  status: 'active',
};
const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('API shares CSRF initialization, includes cookies and resets tokens after rotation', async () => {
  const calls = [];
  let tokens = 0;
  const api = createApiClient({
    fetcher: async (url, options) => {
      calls.push({ url, ...options });
      return url.endsWith('/auth/csrf')
        ? json({ data: { csrfToken: `token-${++tokens}` } })
        : new Response(null, { status: 204 });
    },
  });
  await Promise.all([
    api.request('/one', { method: 'POST', body: { a: 1 } }),
    api.request('/two', { method: 'DELETE' }),
  ]);
  assert.equal(tokens, 1);
  assert.ok(calls.every((call) => call.credentials === 'include'));
  assert.equal(calls[1].headers['X-CSRF-Token'], 'token-1');
  assert.equal(calls[1].body, '{"a":1}');
  await api.request('/list?page=2');
  assert.equal(calls.at(-1).headers['X-CSRF-Token'], undefined);
  api.resetCsrf();
  await api.request('/three', { method: 'POST' });
  assert.equal(tokens, 2);
});

test('API normalizes planned and Nest errors, handles 401 and hides server internals', async () => {
  let expired = 0;
  let result = json(
    {
      error: {
        code: 'INVALID_INPUT',
        message: 'Check the form.',
        fields: { name: 'Required' },
      },
    },
    422,
  );
  const api = createApiClient({
    fetcher: async () => result,
    onUnauthorized: () => expired++,
  });
  await assert.rejects(
    api.request('/data'),
    (error) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.fields.name === 'Required',
  );
  result = json(
    { message: ['Invalid ID', 'Missing name'], error: 'Bad Request' },
    400,
  );
  await assert.rejects(api.request('/data'), /Invalid ID Missing name/);
  result = json({ message: 'SQL password details' }, 500);
  await assert.rejects(
    api.request('/data'),
    (error) => error.status === 500 && !error.message.includes('SQL'),
  );
  result = json({ message: 'Expired' }, 401);
  await assert.rejects(api.request('/data'), (error) => error.status === 401);
  assert.equal(expired, 1);
});

test('mock mode blocks all network access; cancellation and bad responses are explicit', async () => {
  let count = 0;
  const blocked = createApiClient({
    blocked: true,
    fetcher: async () => count++,
  });
  await assert.rejects(
    blocked.request('/users'),
    (error) => error.code === 'MOCK_MODE',
  );
  await assert.rejects(
    blocked.request('/users', { method: 'POST' }),
    (error) => error.code === 'MOCK_MODE',
  );
  assert.equal(count, 0);
  const network = createApiClient({
    fetcher: async () => {
      throw new TypeError('fetch failed');
    },
  });
  await assert.rejects(
    network.request('/users'),
    (error) => error.code === 'NETWORK_ERROR',
  );
  const aborted = createApiClient({
    fetcher: async () => {
      throw new DOMException('aborted', 'AbortError');
    },
  });
  await assert.rejects(
    aborted.request('/users'),
    (error) => error.name === 'AbortError',
  );
  const invalid = createApiClient({
    fetcher: async () => new Response('<html>'),
  });
  await assert.rejects(
    invalid.request('/users'),
    (error) => error.code === 'INVALID_RESPONSE',
  );
  await assert.rejects(invalid.request('//elsewhere.test/users'), TypeError);
});

test('CSRF failures never send or automatically replay a mutation', async () => {
  const calls = [];
  let tokenResponse = { data: {} };
  const api = createApiClient({
    fetcher: async (url) => {
      calls.push(url);
      return url.endsWith('/auth/csrf')
        ? json(tokenResponse)
        : json(
            { error: { code: 'CSRF_INVALID', message: 'Expired token' } },
            403,
          );
    },
  });
  await assert.rejects(
    api.request('/write', { method: 'POST' }),
    (error) => error.code === 'INVALID_CSRF_RESPONSE',
  );
  assert.deepEqual(calls, ['/api/v1/auth/csrf']);
  tokenResponse = { data: { csrfToken: 'new' } };
  await assert.rejects(
    api.request('/write', { method: 'POST' }),
    (error) => error.code === 'CSRF_INVALID',
  );
  assert.equal(calls.filter((path) => path.endsWith('/write')).length, 1);
  await assert.rejects(api.request('/write', { method: 'POST' }));
  assert.equal(calls.filter((path) => path.endsWith('/auth/csrf')).length, 3);
});

test('auth restoration deduplicates requests and cannot resurrect a logged-out user', async () => {
  const pending = deferred();
  let reads = 0;
  const auth = createAuth({
    currentUser: () => {
      reads++;
      return pending.promise;
    },
  });
  const first = auth.restore();
  const second = auth.restore();
  assert.equal(reads, 1);
  auth.invalidate();
  pending.resolve(profile);
  await Promise.all([first, second]);
  assert.equal(auth.state.user, null);
  assert.equal(auth.state.status, 'guest');
});

test('auth allowlists profiles, distinguishes outages and rejects inactive/invalid accounts', async () => {
  const adapter = {
    currentUser: async () => ({ ...profile, password_hash: 'hidden' }),
    login: async () => profile,
    logout: async () => {},
  };
  const auth = createAuth(adapter);
  await auth.restore();
  assert.deepEqual({ ...auth.state.user }, profile);
  await auth.logout();
  assert.equal(auth.state.status, 'guest');
  await auth.login({});
  assert.equal(auth.state.status, 'authenticated');
  adapter.currentUser = async () => {
    throw new Error('Offline');
  };
  await auth.restore({ force: true });
  assert.equal(auth.state.status, 'error');
  assert.equal(auth.state.user, null);
  adapter.currentUser = async () => ({ ...profile, status: 'inactive' });
  await auth.restore({ force: true });
  assert.equal(auth.state.status, 'error');
});

test('HTTP session adapter treats only 401 as signed out and resets CSRF on login/logout', async () => {
  let error = { status: 401 };
  let resets = 0;
  const adapter = createSessionAdapter({
    request: async () => {
      if (error) throw error;
      return { data: profile };
    },
    resetCsrf: () => resets++,
  });
  assert.equal(await adapter.currentUser(), null);
  error = { status: 503 };
  await assert.rejects(adapter.currentUser(), (value) => value.status === 503);
  error = null;
  assert.deepEqual(await adapter.login({}), profile);
  await adapter.logout();
  assert.equal(resets, 2);
});

test('guards distinguish guest, forbidden and unavailable; menus follow roles', async () => {
  const auth = createAuth({ currentUser: async () => null });
  const guard = createAccessGuard(auth);
  const destination = {
    fullPath: '/attendance/history',
    meta: { requiresAuth: true, roles: ['student'] },
  };
  assert.deepEqual(await guard(destination), {
    name: 'login',
    query: { redirect: '/attendance/history' },
  });
  const student = createAuth({ currentUser: async () => profile });
  assert.equal(await createAccessGuard(student)(destination), true);
  assert.deepEqual(
    await createAccessGuard(student)({
      ...destination,
      meta: { requiresAuth: true, roles: ['admin'] },
    }),
    { name: 'forbidden' },
  );
  const offline = createAuth({
    currentUser: async () => {
      throw new Error('Offline');
    },
  });
  assert.equal(
    (await createAccessGuard(offline)(destination)).name,
    'session-unavailable',
  );
  assert.ok(
    navigationForRole('student').some((item) => item.to === '/my-classes'),
  );
  assert.ok(
    !navigationForRole('teacher').some(
      (item) => item.to === '/admin/invitations',
    ),
  );
  assert.equal(navigationForRole('guest').length, 0);
  for (const redirect of [
    'https://elsewhere.test',
    '//elsewhere.test',
    '/\\elsewhere.test',
    '/login?redirect=/login',
    '/session-unavailable',
  ]) {
    assert.equal(safeRedirect(redirect, '/my-classes'), '/my-classes');
  }
  assert.equal(safeRedirect('/attendance/history'), '/attendance/history');
});

test('mock identity uses only known fixture roles and remains usable without storage', async () => {
  const storage = {
    getItem: () => 'admin',
    setItem: () => {
      throw new Error('unavailable');
    },
  };
  const mock = createMockSession(storage);
  assert.equal((await mock.currentUser()).role, 'admin');
  mock.selectRole('unrecognised');
  assert.equal(await mock.currentUser(), null);
  mock.selectRole('teacher');
  assert.equal((await mock.currentUser()).role, 'teacher');
  await mock.logout();
  assert.equal(await mock.currentUser(), null);
});
