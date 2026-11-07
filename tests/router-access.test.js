import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../src/features/auth/store/create-auth.js';
import { createAccessGuard, safeRedirect } from '../src/router/access.js';
import { navigationForRole } from '../src/layouts/navigation.js';
import { profile } from './helpers/fixtures.js';
import routes from '../src/features/enrolments/routes.js';

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
    !navigationForRole('lecturer').some(
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

test('assigned classes navigation and route are lecturer-only', () => {
  assert.deepEqual(
    routes.find((r) => r.name === 'lecturer-classes').meta.roles,
    ['lecturer'],
  );
  for (const role of ['student', 'admin', 'lecturer']) {
    const links = navigationForRole(role);
    assert.equal(
      links.some((l) => l.to === '/lecturer/classes'),
      role === 'lecturer',
    );
    if (role === 'lecturer')
      assert.equal(
        links.some((l) => l.to === '/enrolments'),
        false,
      );
  }
});
