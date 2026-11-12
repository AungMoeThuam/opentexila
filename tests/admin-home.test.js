import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useAdminHomeCounts } from '../src/features/dashboard/composables/use-admin-home-counts.js';
import {
  ADMIN_HOME_LINKS,
  countLabel,
} from '../src/features/dashboard/services/admin-home-links.js';
import dashboardRoutes from '../src/features/dashboard/routes.js';
import { navigationForRole } from '../src/layouts/navigation.js';
import { ApiError } from '../src/shared/services/api-client.js';

const listing = (total) => async () => ({
  data: [],
  meta: { page: 1, limit: 1, total, totalPages: total },
});

test('admin home shortcuts match the admin menu and use real paths', () => {
  assert.deepEqual(
    ADMIN_HOME_LINKS.map((link) => link.to),
    [
      '/admin/courses',
      '/admin/classes',
      '/admin/enrolments',
      '/attendance/classes',
      '/admin/invitations',
    ],
  );
  const menu = navigationForRole('admin').map((item) => item.to);
  for (const link of ADMIN_HOME_LINKS)
    assert.ok(menu.includes(link.to), `${link.to} is in the admin menu`);
  assert.equal(
    new Set(ADMIN_HOME_LINKS.map((link) => link.key)).size,
    ADMIN_HOME_LINKS.length,
  );
  for (const link of ADMIN_HOME_LINKS) {
    assert.ok(link.title && link.description, link.key);
    assert.equal(/teacher/i.test(link.title + link.description), false);
  }
});

test('the admin home route is admin-only', () => {
  const route = dashboardRoutes.find((item) => item.name === 'admin-home');
  assert.equal(route.path, 'admin/home');
  assert.deepEqual(route.meta.roles, ['admin']);
});

test('count labels use the singular and are empty until known', () => {
  const pair = ['course', 'courses'];
  assert.equal(countLabel(0, pair), '0 courses');
  assert.equal(countLabel(1, pair), '1 course');
  assert.equal(countLabel(12, pair), '12 courses');
  for (const unknown of [null, undefined, -1, 1.5, '3'])
    assert.equal(countLabel(unknown, pair), null, String(unknown));
});

test('totals load from one row per list and set the state', async () => {
  const requests = [];
  const spy = (total) => async (params, options) => {
    requests.push(params);
    return listing(total)(params, options);
  };
  const home = useAdminHomeCounts({
    coursesService: { list: spy(12) },
    classesService: { list: spy(1) },
  });
  assert.equal(home.state.value, 'loading');
  await home.load();
  assert.equal(home.state.value, 'success');
  assert.deepEqual(home.counts.value, { courses: 12, classes: 1 });
  assert.deepEqual(requests, [
    { page: 1, limit: 1 },
    { page: 1, limit: 1 },
  ]);
});

test('no courses and no classes is the empty state', async () => {
  const home = useAdminHomeCounts({
    coursesService: { list: listing(0) },
    classesService: { list: listing(0) },
  });
  await home.load();
  assert.equal(home.state.value, 'empty');
  assert.deepEqual(home.counts.value, { courses: 0, classes: 0 });
  // One of them is enough to show the totals.
  const some = useAdminHomeCounts({
    coursesService: { list: listing(0) },
    classesService: { list: listing(3) },
  });
  await some.load();
  assert.equal(some.state.value, 'success');
});

test('a failure shows the error state and Retry loads again', async () => {
  let fail = true;
  const home = useAdminHomeCounts({
    coursesService: {
      list: async (...args) => {
        if (fail) throw new ApiError('Offline', { code: 'NETWORK_ERROR' });
        return listing(2)(...args);
      },
    },
    classesService: { list: listing(4) },
  });
  await home.load();
  assert.equal(home.state.value, 'error');
  assert.equal(home.error.value.message, 'Offline');
  assert.deepEqual(home.counts.value, { courses: null, classes: null });
  fail = false;
  await home.retry();
  assert.equal(home.state.value, 'success');
  assert.equal(home.error.value, null);
  assert.deepEqual(home.counts.value, { courses: 2, classes: 4 });
});

test('a newer load replaces an older one and stop cancels it', async () => {
  const signals = [];
  let release;
  const slow = new Promise((resolve) => {
    release = resolve;
  });
  let call = 0;
  const home = useAdminHomeCounts({
    coursesService: {
      list: async (params, { signal }) => {
        signals.push(signal);
        call += 1;
        if (call === 1) {
          await slow;
          return listing(99)(params);
        }
        return listing(5)(params);
      },
    },
    classesService: { list: listing(6) },
  });
  const first = home.load();
  await home.load();
  assert.equal(signals[0].aborted, true, 'the first request was cancelled');
  release();
  await first;
  assert.deepEqual(home.counts.value, { courses: 5, classes: 6 });
  home.stop();
  assert.equal(signals.at(-1).aborted, true);
});
