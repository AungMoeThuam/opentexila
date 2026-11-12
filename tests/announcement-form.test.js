import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BODY,
  MAX_TITLE,
  changedAnnouncementFields,
  charactersLeft,
  validateAnnouncementForm,
} from '../src/features/announcements/services/announcement-validation.js';
import { createAnnouncementWriteService } from '../src/features/announcements/services/announcement-write-service.js';
import {
  POSTS,
  createMockAnnouncementWriteService,
  createMockAnnouncementsService,
} from '../src/features/announcements/services/mock-announcements.js';
import announcementRoutes from '../src/features/announcements/routes.js';
import { formErrorsFrom } from '../src/features/courses/services/form-errors.js';
import { navigationForRole } from '../src/layouts/navigation.js';

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
const post = {
  id: 41,
  class_id: 7,
  category: 'class_change',
  title: 'Room change',
  body: 'Moved to EN305.',
};
const valid = {
  class_id: '7',
  category: 'exam',
  title: '  Quiz  ',
  body: ' Bring a pen. ',
};

test('create validation trims text and needs a class, category, title and body', () => {
  const ok = validateAnnouncementForm(valid, { requireClass: true });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.payload, {
    class_id: 7,
    category: 'exam',
    title: 'Quiz',
    body: 'Bring a pen.',
  });
  const empty = validateAnnouncementForm(
    { class_id: '', category: '', title: '   ', body: '' },
    { requireClass: true },
  );
  assert.equal(empty.valid, false);
  assert.deepEqual(Object.keys(empty.errors).sort(), [
    'body',
    'category',
    'class_id',
    'title',
  ]);
  assert.equal(empty.errors.class_id, 'Select a class.');
});

test('validation enforces the length limits and the category list', () => {
  const at = (title, body) =>
    validateAnnouncementForm({ ...valid, title, body }, { requireClass: true });
  assert.equal(at('a'.repeat(MAX_TITLE), 'b'.repeat(MAX_BODY)).valid, true);
  assert.ok(at('a'.repeat(MAX_TITLE + 1), 'x').errors.title);
  assert.ok(at('x', 'b'.repeat(MAX_BODY + 1)).errors.body);
  // Spaces around the text do not count towards the limit.
  assert.equal(at(` ${'a'.repeat(MAX_TITLE)} `, 'x').valid, true);
  const news = validateAnnouncementForm(
    { ...valid, category: 'news' },
    { requireClass: true },
  );
  assert.ok(news.errors.category);
  for (const class_id of ['0', 'abc', '1.5', '-1', '4294967296', null]) {
    const check = validateAnnouncementForm(
      { ...valid, class_id },
      { requireClass: true },
    );
    assert.ok(check.errors.class_id, String(class_id));
  }
  assert.equal(
    validateAnnouncementForm({ ...valid, class_id: 7 }, { requireClass: true })
      .valid,
    true,
    'a number is accepted too',
  );
});

test('edit validation ignores the class and sends no class_id', () => {
  const check = validateAnnouncementForm(
    { category: 'general', title: 'T', body: 'B' },
    { requireClass: false },
  );
  assert.equal(check.valid, true);
  assert.deepEqual(check.payload, {
    category: 'general',
    title: 'T',
    body: 'B',
  });
});

test('edit sends only the changed fields', () => {
  const same = {
    category: 'class_change',
    title: 'Room change',
    body: 'Moved to EN305.',
  };
  assert.deepEqual(changedAnnouncementFields(same, post), {});
  assert.deepEqual(changedAnnouncementFields({ ...same, title: 'New' }, post), {
    title: 'New',
  });
  assert.deepEqual(
    changedAnnouncementFields(
      { category: 'exam', title: 'Room change', body: 'x' },
      post,
    ),
    { category: 'exam', body: 'x' },
  );
});

test('the body counter counts trimmed characters', () => {
  assert.equal(charactersLeft(''), MAX_BODY);
  assert.equal(charactersLeft('  abc  '), MAX_BODY - 3);
  assert.equal(charactersLeft('a'.repeat(MAX_BODY + 2)), -2);
});

test('server field errors reach the form fields', () => {
  const mapped = formErrorsFrom({
    code: 'VALIDATION_ERROR',
    fields: { title: 'title must be 1 to 150 characters.' },
  });
  assert.equal(mapped.message, 'Please correct the highlighted fields.');
  assert.equal(mapped.fields.title, 'title must be 1 to 150 characters.');
});

test('write service builds the paths and bodies of the API contract', async () => {
  const api = fakeApi((path, options) =>
    options.method === 'DELETE' ? undefined : { data: post },
  );
  const service = createAnnouncementWriteService({ api });
  assert.deepEqual(await service.get('41'), post);
  assert.deepEqual(
    await service.create(7, { category: 'general', title: 'T', body: 'B' }),
    post,
  );
  assert.deepEqual(await service.update('41', { title: 'New' }), post);
  assert.equal(await service.remove(41), undefined);
  assert.deepEqual(
    api.requests.map(([path, { method = 'GET', body }]) => [
      method,
      path,
      body,
    ]),
    [
      ['GET', '/announcements/41', undefined],
      [
        'POST',
        '/classes/7/announcements',
        { category: 'general', title: 'T', body: 'B' },
      ],
      ['PATCH', '/announcements/41', { title: 'New' }],
      ['DELETE', '/announcements/41', undefined],
    ],
  );
});

test('write service rejects bad IDs before any request and bad responses', async () => {
  const api = fakeApi(() => ({ data: post }));
  const service = createAnnouncementWriteService({ api });
  for (const bad of [0, 'abc', '1.5', -1, 4294967296, undefined]) {
    await assert.rejects(service.get(bad), RangeError, String(bad));
    await assert.rejects(service.remove(bad), RangeError);
    await assert.rejects(service.create(bad, {}), RangeError);
  }
  assert.deepEqual(api.requests, []);
  const broken = createAnnouncementWriteService({
    api: fakeApi(() => ({ data: null })),
  });
  await assert.rejects(broken.update(1, { title: 'x' }), {
    code: 'INVALID_RESPONSE',
  });
});

test('mock write service shares posts with the mock feed', async () => {
  const before = POSTS.length;
  const write = createMockAnnouncementWriteService();
  const feed = createMockAnnouncementsService();
  const created = await write.create(1, {
    category: 'reminder',
    title: 'Mock post',
    body: 'Mock body',
  });
  assert.equal(created.like_count, 0);
  assert.equal(created.class.course.code, 'COS30043');
  assert.equal(
    (await feed.list({ search: 'Mock post' })).data.length,
    1,
    'the feed sees the new post',
  );
  const edited = await write.update(created.id, { title: 'Mock post 2' });
  assert.equal(edited.title, 'Mock post 2');
  assert.ok(Date.parse(edited.updated_at) >= Date.parse(edited.created_at));
  await write.remove(created.id);
  assert.equal(POSTS.length, before);
  await assert.rejects(write.get(created.id), { status: 404 });
  await assert.rejects(write.create(99, {}), { status: 404 });
});

test('form routes are lecturer-only and the menu links to the feed', () => {
  const find = (name) =>
    announcementRoutes.find((route) => route.name === name);
  assert.equal(
    find('lecturer-announcement-new').path,
    'lecturer/announcements/new',
  );
  assert.equal(
    find('lecturer-announcement-edit').path,
    'lecturer/announcements/:announcementId(\\d+)/edit',
  );
  for (const name of [
    'lecturer-announcement-new',
    'lecturer-announcement-edit',
  ])
    assert.deepEqual(find(name).meta.roles, ['lecturer'], name);
  assert.ok(
    navigationForRole('lecturer').some(
      (item) => item.to === '/lecturer/announcements',
    ),
  );
});
