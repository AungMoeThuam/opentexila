import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createApiClient,
  ApiError,
} from '../src/shared/services/api-client.js';
import { json } from './helpers/fixtures.js';

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
