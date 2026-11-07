import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionAdapter } from '../src/features/auth/services/session-adapter.js';
import { profile } from './helpers/fixtures.js';

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
