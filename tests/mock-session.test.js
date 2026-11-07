import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSession } from '../src/dev/mock-session.js';

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
  mock.selectRole('lecturer');
  assert.equal((await mock.currentUser()).role, 'lecturer');
  await mock.logout();
  assert.equal(await mock.currentUser(), null);
});
