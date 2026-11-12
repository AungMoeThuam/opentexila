import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccessGuard } from '../src/router/access.js';

function createMockAuth(user) {
  return {
    state: {
      user,
      status: user ? 'authenticated' : 'guest',
    },
    async restore() {},
  };
}

const user = {
  id: 1,
  name: 'Test Student',
  email: 'student@example.com',
  role: 'student',
  status: 'active',
  must_change_password: true,
};

test('forces password change before accessing protected pages', async () => {
  const guard = createAccessGuard(createMockAuth(user));

  const result = await guard({
    name: 'student-home',
    fullPath: '/student/home',
    meta: { requiresAuth: true },
  });

  assert.deepEqual(result, { name: 'activate' });
});

test('allows forced-password users to access activate', async () => {
  const guard = createAccessGuard(createMockAuth(user));

  const result = await guard({
    name: 'activate',
    fullPath: '/activate',
    meta: { requiresAuth: true },
  });

  assert.equal(result, true);
});

test('redirects guests from activate to login', async () => {
  const guard = createAccessGuard(createMockAuth(null));

  const result = await guard({
    name: 'activate',
    fullPath: '/activate',
    meta: { requiresAuth: true },
  });

  assert.deepEqual(result, {
    name: 'login',
    query: { redirect: '/activate' },
  });
});

test('redirects users without a password-change requirement away from activate', async () => {
  const guard = createAccessGuard(
    createMockAuth({
      ...user,
      must_change_password: false,
    }),
  );

  const result = await guard({
    name: 'activate',
    fullPath: '/activate',
    meta: { requiresAuth: true },
  });

  assert.equal(result, '/student/home');
});

test('forces password change even when visiting the login page', async () => {
  const guard = createAccessGuard(createMockAuth(user));

  const result = await guard({
    name: 'login',
    fullPath: '/login',
    meta: { guestOnly: true },
  });

  assert.deepEqual(result, { name: 'activate' });
});

test('forces password change before accessing public pages', async () => {
  const guard = createAccessGuard(createMockAuth(user));

  const result = await guard({
    name: 'style-guide',
    fullPath: '/style-guide',
    meta: {},
  });

  assert.deepEqual(result, { name: 'activate' });
});
