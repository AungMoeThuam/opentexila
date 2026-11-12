import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/shared/services/api-client.js';
import { createChangePasswordService } from '../src/features/auth/services/change-password-service.js';

test('change password sends POST with Bearer JWT and without CSRF', async () => {
  const requests = [];

  const api = createApiClient({
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return { status: 204, ok: true };
    },
  });

  api.setAccessToken('test-access-token');

  const service = createChangePasswordService(api);
  const result = await service.changePassword({
    current_password: 'OldPassword123!',
    new_password: 'NewPassword456!',
  });

  assert.equal(result, null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/v1/auth/change-password');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(
    requests[0].options.headers.Authorization,
    'Bearer test-access-token',
  );
  assert.equal(requests[0].options.headers['X-CSRF-Token'], undefined);

  assert.deepEqual(JSON.parse(requests[0].options.body), {
    currentPassword: 'OldPassword123!',
    newPassword: 'NewPassword456!',
  });
});

test('ordinary POST requests still require CSRF', async () => {
  const requests = [];

  const api = createApiClient({
    fetcher: async (url, options) => {
      requests.push({ url, options });

      if (url.endsWith('/auth/csrf')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            data: { csrfToken: 'test-csrf-token' },
          }),
        };
      }

      return { status: 204, ok: true };
    },
  });

  await api.request('/test', {
    method: 'POST',
    body: { example: true },
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/api/v1/auth/csrf');
  assert.equal(requests[1].options.headers['X-CSRF-Token'], 'test-csrf-token');
});

test('INVALID_CREDENTIALS keeps JWT and authenticated session', async () => {
  let unauthorizedCalls = 0;

  const api = createApiClient({
    onUnauthorized: () => unauthorizedCalls++,
    fetcher: async () => ({
      status: 401,
      ok: false,
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Current password is incorrect.',
        },
      }),
    }),
  });

  api.setAccessToken('test-access-token');
  const service = createChangePasswordService(api);

  await assert.rejects(
    service.changePassword({
      current_password: 'WrongPassword123!',
      new_password: 'NewPassword456!',
    }),
    (error) => error.status === 401 && error.code === 'INVALID_CREDENTIALS',
  );

  assert.equal(api.getAccessToken(), 'test-access-token');
  assert.equal(unauthorizedCalls, 0);
});

test('UNAUTHENTICATED clears JWT and invalidates session', async () => {
  let unauthorizedCalls = 0;

  const api = createApiClient({
    onUnauthorized: () => unauthorizedCalls++,
    fetcher: async () => ({
      status: 401,
      ok: false,
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.',
        },
      }),
    }),
  });

  api.setAccessToken('test-access-token');
  const service = createChangePasswordService(api);

  await assert.rejects(
    service.changePassword({
      current_password: 'OldPassword123!',
      new_password: 'NewPassword456!',
    }),
    (error) => error.status === 401 && error.code === 'UNAUTHENTICATED',
  );

  assert.equal(api.getAccessToken(), null);
  assert.equal(unauthorizedCalls, 1);
});
