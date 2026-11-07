import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../src/features/auth/store/create-auth.js';
import { profile, deferred } from './helpers/fixtures.js';

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
