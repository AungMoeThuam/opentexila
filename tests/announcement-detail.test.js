import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_COMMENT,
  validateComment,
} from '../src/features/announcements/services/announcement-validation.js';
import {
  optimisticLike,
  settleLike,
} from '../src/features/announcements/services/like-state.js';
import { useLike } from '../src/features/announcements/composables/use-like.js';
import { createAnnouncementEngagementService } from '../src/features/announcements/services/announcement-engagement-service.js';
import {
  POSTS,
  createMockAnnouncementEngagementService,
} from '../src/features/announcements/services/mock-announcements.js';
import announcementRoutes from '../src/features/announcements/routes.js';

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
const comment = {
  id: 90,
  body: 'Thank you.',
  author: { id: 21, name: 'Student Two', role: 'student' },
  created_at: '2026-11-12T02:00:00.000Z',
  can_delete: true,
};
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test('comment validation trims and limits the text', () => {
  assert.deepEqual(validateComment('  Hello  '), {
    valid: true,
    error: '',
    body: 'Hello',
  });
  for (const empty of ['', '   ', '\n\t', undefined, null]) {
    const check = validateComment(empty);
    assert.equal(check.valid, false, String(empty));
    assert.ok(check.error);
  }
  assert.equal(validateComment('a'.repeat(MAX_COMMENT)).valid, true);
  assert.equal(validateComment(` ${'a'.repeat(MAX_COMMENT)} `).valid, true);
  const long = validateComment('a'.repeat(MAX_COMMENT + 1));
  assert.equal(long.valid, false);
  assert.match(long.error, /1000/);
});

test('like state changes at once and settles on the server count', () => {
  assert.deepEqual(optimisticLike({ liked: false, like_count: 12 }), {
    liked: true,
    like_count: 13,
  });
  assert.deepEqual(optimisticLike({ liked: true, like_count: 13 }), {
    liked: false,
    like_count: 12,
  });
  assert.equal(
    optimisticLike({ liked: true, like_count: 0 }).like_count,
    0,
    'the count never goes below 0',
  );
  assert.deepEqual(
    settleLike(
      { liked: false, like_count: 12 },
      { liked: true, like_count: 15 },
    ),
    { liked: true, like_count: 15 },
  );
});

test('useLike updates at once, ignores clicks while busy and undoes a failure', async () => {
  const pending = deferred();
  const calls = [];
  const service = {
    like: (id) => {
      calls.push(['like', id]);
      return pending.promise;
    },
    unlike: (id) => {
      calls.push(['unlike', id]);
      return pending.promise;
    },
  };
  const like = useLike({ service });
  like.set({ liked_by_me: false, like_count: 12 });

  const first = like.toggle(41);
  assert.deepEqual(
    [like.state.liked, like.state.like_count, like.state.busy],
    [true, 13, true],
    'the change shows before the server answers',
  );
  await like.toggle(41); // ignored while busy
  assert.deepEqual(calls, [['like', 41]], 'one request at a time');
  pending.resolve({ liked: true, like_count: 14 });
  await first;
  assert.deepEqual(
    [like.state.liked, like.state.like_count, like.state.busy],
    [true, 14, false],
    'the server count is final',
  );

  const failing = useLike({
    service: {
      like: async () => {
        throw new Error('The server is not available.');
      },
      unlike: async () => {
        throw new Error('Unlike failed.');
      },
    },
  });
  failing.set({ liked_by_me: false, like_count: 5 });
  await assert.rejects(failing.toggle(1), /not available/);
  assert.deepEqual(
    [failing.state.liked, failing.state.like_count, failing.state.busy],
    [false, 5, false],
    'a failed like is undone',
  );
  assert.equal(failing.state.error, 'The server is not available.');
  failing.set({ liked_by_me: true, like_count: 5 });
  await assert.rejects(failing.toggle(1), /Unlike failed/);
  assert.deepEqual([failing.state.liked, failing.state.like_count], [true, 5]);
  assert.equal(failing.state.error, 'Unlike failed.');
});

test('engagement service builds the paths and bodies of the API contract', async () => {
  const api = fakeApi((path, options) => {
    if (path === '/announcements/41' && !options.method)
      return { data: { id: 41, title: 'T' } };
    if (path.endsWith('/like'))
      return { data: { liked: options.method === 'PUT', like_count: 13 } };
    if (path.includes('/comments?'))
      return {
        data: [comment],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
    if (options.method === 'POST') return { data: comment };
    return undefined;
  });
  const service = createAnnouncementEngagementService({ api });
  assert.equal((await service.get('41')).id, 41);
  assert.deepEqual(await service.like(41), { liked: true, like_count: 13 });
  assert.deepEqual(await service.unlike(41), { liked: false, like_count: 13 });
  assert.equal(
    (await service.listComments(41, { page: 2, limit: 10 })).meta.total,
    1,
  );
  assert.deepEqual(await service.addComment(41, 'Thank you.'), comment);
  assert.equal(await service.deleteComment(90), undefined);
  assert.equal(await service.deletePost(41), undefined);
  assert.deepEqual(
    api.requests.map(([path, { method = 'GET', body }]) => [
      method,
      path,
      body,
    ]),
    [
      ['GET', '/announcements/41', undefined],
      ['PUT', '/announcements/41/like', undefined],
      ['DELETE', '/announcements/41/like', undefined],
      ['GET', '/announcements/41/comments?page=2&limit=10', undefined],
      ['POST', '/announcements/41/comments', { body: 'Thank you.' }],
      ['DELETE', '/comments/90', undefined],
      ['DELETE', '/announcements/41', undefined],
    ],
  );
});

test('engagement service rejects bad IDs before any request and bad responses', async () => {
  const api = fakeApi(() => ({ data: {} }));
  const service = createAnnouncementEngagementService({ api });
  for (const bad of [0, 'abc', -1, 4294967296, undefined]) {
    await assert.rejects(service.like(bad), RangeError, String(bad));
    await assert.rejects(service.deleteComment(bad), RangeError);
    await assert.rejects(service.listComments(bad), RangeError);
  }
  await assert.rejects(service.listComments(1, { page: 0 }), RangeError);
  assert.deepEqual(api.requests, []);
  await assert.rejects(service.like(1), { code: 'INVALID_RESPONSE' });
  await assert.rejects(service.addComment(1, 'x'), {
    code: 'INVALID_RESPONSE',
  });
  await assert.rejects(service.listComments(1), { code: 'INVALID_RESPONSE' });
  const noFlag = createAnnouncementEngagementService({
    api: fakeApi(() => ({
      data: [{ id: 1, body: 'x' }],
      meta: { totalPages: 1 },
    })),
  });
  await assert.rejects(noFlag.listComments(1), { code: 'INVALID_RESPONSE' });
});

test('mock engagement service follows the server rules for each role', async () => {
  let current = { id: 21, name: 'Student Two', role: 'student' };
  const service = createMockAnnouncementEngagementService({
    currentUser: () => current,
  });
  const postId = 1;

  // Like and unlike change the count by one and repeat safely.
  const before = (await service.get(postId)).like_count;
  const liked = await service.like(postId);
  assert.equal(liked.liked, true);
  const likedAgain = await service.like(postId);
  assert.equal(
    likedAgain.like_count,
    liked.like_count,
    'a second PUT adds none',
  );
  assert.equal(Math.abs(liked.like_count - before) <= 1, true);
  const unliked = await service.unlike(postId);
  assert.equal(unliked.liked, false);
  assert.equal((await service.unlike(postId)).like_count, unliked.like_count);

  // A student deletes only own comments.
  const written = await service.addComment(postId, 'My comment');
  assert.equal(written.can_delete, true);
  assert.equal(written.author.id, 21);
  const list = await service.listComments(postId, { page: 1, limit: 20 });
  const others = list.data.filter((item) => item.author.id !== 21);
  assert.ok(others.length > 0);
  assert.ok(others.every((item) => item.can_delete === false));
  await assert.rejects(service.deleteComment(others[0].id), { status: 403 });
  await service.deleteComment(written.id);
  await assert.rejects(service.deleteComment(written.id), { status: 404 });
  await assert.rejects(service.deletePost(postId), { status: 403 });

  // A lecturer deletes any comment.
  current = { id: 2, name: 'Lecturer One', role: 'lecturer' };
  const asLecturer = await service.listComments(postId, { page: 1, limit: 20 });
  assert.ok(asLecturer.data.every((item) => item.can_delete));

  // An admin neither likes nor comments, deletes comments and the post.
  current = { id: 1, name: 'Admin', role: 'admin' };
  assert.equal((await service.get(postId)).liked_by_me, false);
  await assert.rejects(service.like(postId), { status: 403 });
  await assert.rejects(service.addComment(postId, 'x'), { status: 403 });
  const target = (await service.listComments(postId, { page: 1, limit: 20 }))
    .data[0];
  await service.deleteComment(target.id);
  const count = POSTS.length;
  await service.deletePost(postId);
  assert.equal(POSTS.length, count - 1);
  await assert.rejects(service.get(postId), { status: 404 });
});

test('mock comments page with Load more and keep HTML as text', async () => {
  const service = createMockAnnouncementEngagementService({
    currentUser: () => ({ id: 2, name: 'Lecturer One', role: 'lecturer' }),
  });
  const first = await service.listComments(3, { page: 1, limit: 20 });
  assert.deepEqual(first.meta, {
    page: 1,
    limit: 20,
    total: 24,
    totalPages: 2,
  });
  const second = await service.listComments(3, { page: 2, limit: 20 });
  assert.equal(second.data.length, 4);
  const ids = [...first.data, ...second.data].map((item) => item.id);
  assert.equal(new Set(ids).size, 24, 'no comment appears twice');
  const html = (await service.listComments(2, { page: 1, limit: 20 })).data;
  assert.deepEqual(html, []);
});

test('the detail routes keep their names, paths and roles', () => {
  const expected = {
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
  for (const [name, [path, role]] of Object.entries(expected)) {
    const route = announcementRoutes.find((item) => item.name === name);
    assert.equal(route.path, path, name);
    assert.deepEqual(route.meta.roles, [role], name);
  }
});
