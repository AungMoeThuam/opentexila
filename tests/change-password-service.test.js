import assert from 'node:assert/strict';
import test from 'node:test';
import { createChangePasswordService } from '../src/features/auth/services/change-password-service.js';

test('change password sends only the required fields', async () => {
  const calls = [];

  const api = {
    async request(path, options) {
      calls.push({ path, options });
      return null;
    },
  };

  const service = createChangePasswordService(api);

  await service.changePassword({
    current_password: 'old-password-123',
    new_password: 'new-password-456',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/auth/change-password');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.csrf, false);

  assert.deepEqual(calls[0].options.body, {
    currentPassword: 'old-password-123',
    newPassword: 'new-password-456',
  });
});
