import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES,
  ROLE_ROUTES,
  SORTS,
  categoryInfo,
  classLabel,
  excerpt,
  isEdited,
  plural,
} from '../src/features/announcements/services/announcement-options.js';
import {
  FEED_DEFAULTS,
  buildFeedQuery,
  parseFeedQuery,
  sameFeedQuery,
} from '../src/features/announcements/services/feed-query.js';
import {
  buildAnnouncementsPath,
  createAnnouncementsService,
} from '../src/features/announcements/services/announcements-service.js';
import { createMockAnnouncementsService } from '../src/features/announcements/services/mock-announcements.js';
import { useAnnouncementFeed } from '../src/features/announcements/composables/use-announcement-feed.js';
import { useClassOptions } from '../src/features/announcements/composables/use-class-options.js';
import announcementRoutes from '../src/features/announcements/routes.js';
import { navigationForRole } from '../src/layouts/navigation.js';
import { ApiError } from '../src/shared/services/api-client.js';

const fakeApi = (respond) => {
  const requests = [];
  return {
    requests,
    request: async (path, options = {}) => {
      requests.push([path, options]);
      return respond(path, options);
    },
  };
};
const page = (data = []) => ({
  data,
  meta: { page: 1, limit: 20, total: data.length, totalPages: 1 },
});

test('announcement helpers', async (t) => {
  await t.test('categories and sorts match the API contract', () => {
    assert.deepEqual(
      CATEGORIES.map((c) => c.value),
      ['general', 'class_change', 'reminder', 'exam'],
    );
    assert.deepEqual(
      SORTS.map((s) => s.value),
      ['newest', 'oldest', 'most_liked'],
    );
    assert.equal(categoryInfo('exam').label, 'Exam');
    assert.equal(categoryInfo('unknown').value, 'general');
  });

  await t.test('classLabel names the course, section and term', () => {
    assert.equal(
      classLabel({
        course: { code: 'COS30043' },
        section: 'A',
        term: '2026-S2',
      }),
      'COS30043 · Section A · 2026-S2',
    );
    assert.equal(classLabel({ course: { code: 'X1' } }), 'X1');
    assert.equal(classLabel(null), '');
  });

  await t.test('excerpt keeps short text and cuts long text at a word', () => {
    assert.equal(excerpt('  short text  '), 'short text');
    assert.equal(excerpt(undefined), '');
    const cut = excerpt(`${'word '.repeat(80)}end`, 50);
    assert.ok(cut.length <= 51);
    assert.ok(cut.endsWith('…'));
    assert.equal(cut.includes('wor…'), false);
    assert.equal(excerpt('x'.repeat(300), 100).length, 101);
  });

  await t.test('isEdited and plural', () => {
    const at = (updated) => ({
      created_at: '2026-11-12T01:00:00Z',
      updated_at: updated,
    });
    assert.equal(isEdited(at('2026-11-12T01:00:00Z')), false);
    assert.equal(isEdited(at('2026-11-12T02:00:00Z')), true);
    assert.equal(isEdited({}), false);
    assert.equal(plural(1, 'like', 'likes'), '1 like');
    assert.equal(plural(0, 'like', 'likes'), '0 likes');
    assert.equal(plural(12, 'comment', 'comments'), '12 comments');
  });
});

test('the feed address keeps filters and ignores bad values', async (t) => {
  await t.test('defaults give an empty address', () => {
    assert.deepEqual(parseFeedQuery({}), FEED_DEFAULTS);
    assert.deepEqual(buildFeedQuery(FEED_DEFAULTS), {});
  });

  await t.test('a full address round-trips', () => {
    const state = {
      classId: '7',
      search: 'quiz',
      category: 'exam',
      sort: 'most_liked',
      page: 3,
    };
    const query = buildFeedQuery(state);
    assert.deepEqual(query, {
      classId: '7',
      search: 'quiz',
      category: 'exam',
      sort: 'most_liked',
      page: '3',
    });
    assert.deepEqual(parseFeedQuery(query), state);
  });

  await t.test('defaults are left out of the address', () => {
    assert.deepEqual(
      buildFeedQuery({
        ...FEED_DEFAULTS,
        sort: 'newest',
        page: 1,
        search: 'a',
      }),
      { search: 'a' },
    );
  });

  await t.test('invalid values fall back to the defaults', () => {
    assert.deepEqual(
      parseFeedQuery({
        classId: '0',
        category: 'news',
        sort: 'random',
        page: '0',
        search: '   ',
      }),
      FEED_DEFAULTS,
    );
    for (const classId of ['abc', '-1', '1.5', '99999999999', '../7'])
      assert.equal(parseFeedQuery({ classId }).classId, '', classId);
    assert.equal(parseFeedQuery({ page: '10001' }).page, 1);
    assert.equal(parseFeedQuery({ search: 'a'.repeat(101) }).search, '');
    // A repeated parameter uses its first value.
    assert.equal(parseFeedQuery({ classId: ['4', '5'] }).classId, '4');
    assert.equal(parseFeedQuery({ search: ' padded ' }).search, 'padded');
  });

  await t.test('sameFeedQuery ignores order, defaults and bad values', () => {
    assert.equal(sameFeedQuery({}, { sort: 'newest', page: '1' }), true);
    assert.equal(sameFeedQuery({ classId: '1' }, { classId: '2' }), false);
    assert.equal(sameFeedQuery({ category: 'nope' }, {}), true);
  });
});

test('buildAnnouncementsPath validates and encodes the list query', () => {
  assert.equal(buildAnnouncementsPath(), '/announcements');
  assert.equal(
    buildAnnouncementsPath({
      classId: '7',
      page: 2,
      limit: 10,
      search: ' a&b ',
      category: 'exam',
      sort: 'most_liked',
    }),
    '/announcements?classId=7&page=2&limit=10&search=a%26b&category=exam&sort=most_liked',
  );
  assert.equal(
    buildAnnouncementsPath({
      classId: '',
      search: '   ',
      category: '',
      sort: '',
    }),
    '/announcements',
  );
  for (const query of [
    { classId: 0 },
    { classId: '../7' },
    { classId: 7.5 },
    { page: 0 },
    { limit: 101 },
    { category: 'news' },
    { sort: 'random' },
    { search: 'a'.repeat(101) },
  ])
    assert.throws(() => buildAnnouncementsPath(query), RangeError);
});

test('announcements service lists across classes and checks the response', async (t) => {
  await t.test('returns data and meta', async () => {
    const result = page([{ id: 1 }]);
    const api = fakeApi(() => result);
    const signal = new AbortController().signal;
    const service = createAnnouncementsService({ api });
    assert.deepEqual(
      await service.list({ classId: '7', sort: 'oldest' }, { signal }),
      result,
    );
    assert.equal(api.requests[0][0], '/announcements?classId=7&sort=oldest');
    assert.equal(api.requests[0][1].signal, signal);
  });

  await t.test('a response without a list or meta is rejected', async () => {
    for (const bad of [
      {},
      { data: [] },
      { data: {}, meta: { totalPages: 1 } },
    ]) {
      const service = createAnnouncementsService({ api: fakeApi(() => bad) });
      await assert.rejects(service.list(), { code: 'INVALID_RESPONSE' });
    }
  });

  await t.test('API errors pass through with their status', async () => {
    const service = createAnnouncementsService({
      api: fakeApi(() => {
        throw new ApiError('Class not found.', {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
        });
      }),
    });
    await assert.rejects(service.list({ classId: 9 }), { status: 404 });
  });
});

test('mock service follows the same list rules', async () => {
  const service = createMockAnnouncementsService();
  const ids = async (params) =>
    (await service.list(params)).data.map((p) => p.id);
  assert.deepEqual(await ids({}), [4, 3, 2, 1]);
  assert.deepEqual(await ids({ sort: 'oldest' }), [1, 2, 3, 4]);
  assert.deepEqual(await ids({ sort: 'most_liked' }), [3, 1, 2, 4]);
  assert.deepEqual(await ids({ category: 'reminder' }), [2]);
  assert.deepEqual(await ids({ search: 'QUIZ' }), [3]);
  assert.deepEqual(await ids({ classId: '1' }), [4, 2, 1]);
  assert.deepEqual(await ids({ classId: '2' }), [3]);
  assert.deepEqual(await ids({ search: 'nothing here' }), []);
  const second = await service.list({ limit: 3, page: 2 });
  assert.deepEqual(
    second.data.map((p) => p.id),
    [1],
  );
  assert.deepEqual(second.meta, { page: 2, limit: 3, total: 4, totalPages: 2 });
  const first = (await service.list()).data[0];
  assert.equal(first.class.course.code, 'COS30043');
  await assert.rejects(service.list({ classId: '99' }), { status: 404 });
  await assert.rejects(service.list({ page: 0 }), RangeError);
});

test('useAnnouncementFeed applies filters and reports every change', async (t) => {
  const makeFeed = () => {
    const calls = [];
    const changes = [];
    const service = {
      list: async (params) => {
        calls.push(params);
        return page([{ id: 1 }]);
      },
    };
    const feed = useAnnouncementFeed({
      service,
      onChange: (state) => changes.push(state),
    });
    return { feed, calls, changes };
  };

  await t.test('loads page 1 with newest first', async () => {
    const { feed, calls } = makeFeed();
    await feed.load();
    assert.deepEqual(calls[0], { page: 1, limit: 20, sort: 'newest' });
    assert.equal(feed.rows.value.length, 1);
    assert.equal(feed.filtered.value, false);
  });

  await t.test(
    'search, class, category and sort go to the service from page 1',
    async () => {
      const { feed, calls, changes } = makeFeed();
      await feed.load();
      feed.page.value = 3;
      feed.search.value = '  quiz ';
      await feed.applySearch();
      assert.deepEqual(calls.at(-1), {
        page: 1,
        limit: 20,
        search: 'quiz',
        sort: 'newest',
      });
      feed.classId.value = '7';
      feed.category.value = 'exam';
      feed.sort.value = 'most_liked';
      await feed.applyChoice();
      assert.deepEqual(calls.at(-1), {
        page: 1,
        limit: 20,
        classId: '7',
        search: 'quiz',
        category: 'exam',
        sort: 'most_liked',
      });
      assert.equal(feed.filtered.value, true);
      assert.deepEqual(changes.at(-1), {
        classId: '7',
        search: 'quiz',
        category: 'exam',
        sort: 'most_liked',
        page: 1,
      });
    },
  );

  await t.test('an over-long search is refused without a request', async () => {
    const { feed, calls, changes } = makeFeed();
    feed.search.value = 'a'.repeat(101);
    await feed.applySearch();
    assert.ok(feed.searchError.value);
    assert.deepEqual(calls, []);
    assert.deepEqual(changes, []);
  });

  await t.test('a class filter alone makes the feed filtered', async () => {
    const { feed } = makeFeed();
    feed.classId.value = '4';
    assert.equal(feed.filtered.value, true);
  });

  await t.test('clear resets every filter and reloads', async () => {
    const { feed, calls, changes } = makeFeed();
    feed.search.value = 'quiz';
    await feed.applySearch();
    feed.classId.value = '7';
    feed.category.value = 'exam';
    feed.sort.value = 'oldest';
    await feed.clearFilters();
    assert.deepEqual(calls.at(-1), { page: 1, limit: 20, sort: 'newest' });
    assert.deepEqual(changes.at(-1), { ...FEED_DEFAULTS });
    assert.equal(feed.search.value, '');
    assert.equal(feed.classId.value, '');
    assert.equal(feed.filtered.value, false);
  });

  await t.test(
    'restore sets the filters and the page from the address',
    async () => {
      const { feed, calls, changes } = makeFeed();
      feed.restore(
        parseFeedQuery({
          classId: '7',
          search: 'quiz',
          sort: 'oldest',
          page: '2',
        }),
      );
      assert.equal(feed.search.value, 'quiz');
      await feed.load();
      assert.deepEqual(calls.at(-1), {
        page: 2,
        limit: 20,
        classId: '7',
        search: 'quiz',
        sort: 'oldest',
      });
      // Restoring from the address does not write the address again.
      assert.deepEqual(changes, []);
    },
  );

  await t.test('changing the page reports it', async () => {
    const calls = [];
    const changes = [];
    const feed = useAnnouncementFeed({
      service: {
        list: async (params) => {
          calls.push(params);
          return {
            ...page([{ id: 1 }]),
            meta: { page: 1, limit: 20, total: 40, totalPages: 2 },
          };
        },
      },
      onChange: (state) => changes.push(state),
    });
    await feed.load();
    await feed.setPage(2);
    assert.equal(calls.at(-1).page, 2);
    assert.equal(changes.at(-1).page, 2);
  });

  await t.test(
    'a failed load exposes the error and keeps no rows',
    async () => {
      const feed = useAnnouncementFeed({
        service: {
          list: async () => {
            throw new ApiError('Gone.', {
              status: 404,
              code: 'RESOURCE_NOT_FOUND',
            });
          },
        },
      });
      await feed.load();
      assert.equal(feed.error.value.status, 404);
      assert.deepEqual(feed.rows.value, []);
      assert.equal(feed.loading.value, false);
    },
  );
});

test('useClassOptions loads every page of classes for the filter', async (t) => {
  const cls = (id, code, section) => ({
    id,
    course: { code },
    section,
    term: '2026-S2',
  });

  await t.test('combines the pages and sorts by label', async () => {
    const calls = [];
    const pages = {
      1: { data: [cls(2, 'COS30043', 'B')], meta: { totalPages: 2 } },
      2: { data: [cls(1, 'COS20007', 'A')], meta: { totalPages: 2 } },
    };
    const classes = useClassOptions({
      list: async (params) => {
        calls.push(params);
        return pages[params.page];
      },
    });
    await classes.load();
    assert.deepEqual(
      calls.map((c) => [c.page, c.limit]),
      [
        [1, 100],
        [2, 100],
      ],
    );
    assert.deepEqual(classes.options.value, [
      { value: '1', label: 'COS20007 · Section A · 2026-S2' },
      { value: '2', label: 'COS30043 · Section B · 2026-S2' },
    ]);
    assert.equal(classes.error.value, null);
  });

  await t.test(
    'a failure leaves no options and records the error',
    async () => {
      const classes = useClassOptions({
        list: async () => {
          throw new ApiError('Offline.', { code: 'NETWORK_ERROR' });
        },
      });
      await classes.load();
      assert.deepEqual(classes.options.value, []);
      assert.equal(classes.error.value.code, 'NETWORK_ERROR');
      assert.equal(classes.loading.value, false);
    },
  );
});

test('announcement routes cover the feed, form and detail pages', () => {
  const byName = Object.fromEntries(announcementRoutes.map((r) => [r.name, r]));
  const expected = {
    'student-announcements': ['student/announcements', 'student'],
    'lecturer-announcements': ['lecturer/announcements', 'lecturer'],
    'admin-announcements': ['admin/announcements', 'admin'],
    'lecturer-announcement-new': ['lecturer/announcements/new', 'lecturer'],
    'lecturer-announcement-edit': [
      'lecturer/announcements/:announcementId(\\d+)/edit',
      'lecturer',
    ],
    'student-announcement': [
      'student/announcements/:announcementId(\\d+)',
      'student',
    ],
    'lecturer-announcement': [
      'lecturer/announcements/:announcementId(\\d+)',
      'lecturer',
    ],
    'admin-announcement': [
      'admin/announcements/:announcementId(\\d+)',
      'admin',
    ],
  };
  assert.equal(announcementRoutes.length, 8);
  for (const [name, [path, role]] of Object.entries(expected)) {
    assert.equal(byName[name]?.path, path, name);
    assert.deepEqual(byName[name].meta.roles, [role], name);
    assert.equal(typeof byName[name].component, 'function', name);
  }
  // The three feed routes share one page; the detail routes share another.
  assert.equal(
    byName['student-announcements'].component,
    byName['admin-announcements'].component,
  );
  assert.equal(
    byName['student-announcement'].component,
    byName['admin-announcement'].component,
  );
});

test('every route name used by the pages exists', () => {
  const known = new Set(announcementRoutes.map((r) => r.name));
  for (const [role, names] of Object.entries(ROLE_ROUTES))
    for (const [key, name] of Object.entries(names))
      assert.ok(known.has(name), `${role}.${key} -> ${name}`);
});

test('the sidebar has an Announcements link for each role', () => {
  const feedRoutes = Object.fromEntries(
    announcementRoutes.map((r) => [r.name, `/${r.path}`]),
  );
  for (const role of ['student', 'lecturer', 'admin']) {
    const link = navigationForRole(role).find(
      (item) => item.label === 'Announcements',
    );
    assert.ok(link, role);
    assert.equal(link.icon, 'bell');
    assert.equal(link.to, feedRoutes[ROLE_ROUTES[role].feed], role);
    assert.deepEqual(link.roles, [role]);
  }
  assert.equal(
    navigationForRole('guest').some((item) => item.label === 'Announcements'),
    false,
  );
});
