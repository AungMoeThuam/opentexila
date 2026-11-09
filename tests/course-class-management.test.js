import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RADIUS_M,
  changedFields,
  classFormValues,
  validateClassForm,
  validateCourseForm,
} from '../src/features/courses/services/course-class-validation.js';
import {
  buildOptionsPath,
  createClassManagementService,
  createCoursesService,
  createLecturersService,
  listAll,
} from '../src/features/courses/services/course-class-services.js';
import { formErrorsFrom } from '../src/features/courses/services/form-errors.js';
import { usePagedList } from '../src/features/courses/composables/use-paged-list.js';
import { ApiError } from '../src/shared/services/api-client.js';

const validClass = () => ({
  course_id: 1,
  term: ' 2026-S2 ',
  section: ' a ',
  lecturer_id: '2',
  room_label: 'EN402',
  latitude: '-37.8221',
  longitude: 145.0389,
  radius_m: '50',
});

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

test('course form validation trims, upper-cases and reports each field', async (t) => {
  await t.test('valid input becomes the request body', () => {
    const result = validateCourseForm({
      code: ' cos30043 ',
      name: ' Interface ',
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.payload, { code: 'COS30043', name: 'Interface' });
  });
  await t.test('invalid input', () => {
    for (const [values, fields] of [
      [{}, ['code', 'name']],
      [{ code: 'COS 300', name: 'X' }, ['code']],
      [{ code: 'CÖS', name: 'X' }, ['code']],
      [{ code: 'X'.repeat(31), name: 'X' }, ['code']],
      [{ code: 'X1', name: '   ' }, ['name']],
      [{ code: 'X1', name: 'n'.repeat(151) }, ['name']],
    ]) {
      const result = validateCourseForm(values);
      assert.equal(result.valid, false, JSON.stringify(values));
      assert.deepEqual(Object.keys(result.errors).sort(), fields);
    }
  });
});

test('class form validation mirrors the backend rules', async (t) => {
  await t.test(
    'valid input is normalised to numbers and trimmed strings',
    () => {
      const result = validateClassForm(validClass());
      assert.equal(result.valid, true, JSON.stringify(result.errors));
      assert.deepEqual(result.payload, {
        course_id: 1,
        term: '2026-S2',
        section: 'A',
        lecturer_id: 2,
        room_label: 'EN402',
        latitude: -37.8221,
        longitude: 145.0389,
        radius_m: 50,
      });
    },
  );
  await t.test('empty form flags every field', () => {
    assert.deepEqual(Object.keys(validateClassForm({}).errors).sort(), [
      'course_id',
      'latitude',
      'lecturer_id',
      'longitude',
      'radius_m',
      'room_label',
      'section',
      'term',
    ]);
  });
  for (const [field, value] of [
    ['course_id', ''],
    ['course_id', '0'],
    ['lecturer_id', '1.5'],
    ['term', 't'.repeat(51)],
    ['section', 'A B'],
    ['room_label', ' '],
    ['latitude', '90.1'],
    ['latitude', 'abc'],
    ['longitude', -180.01],
    ['radius_m', '0'],
    ['radius_m', '0.5'],
    ['radius_m', String(MAX_RADIUS_M + 1)],
    ['radius_m', ''],
  ]) {
    await t.test(`rejects ${field}=${JSON.stringify(value)}`, () => {
      const result = validateClassForm({ ...validClass(), [field]: value });
      assert.equal(result.valid, false);
      assert.ok(result.errors[field]);
    });
  }
  await t.test('accepts the boundaries', () => {
    for (const values of [
      { latitude: -90, longitude: 180, radius_m: 1 },
      { latitude: 90, longitude: -180, radius_m: MAX_RADIUS_M },
    ]) {
      assert.equal(
        validateClassForm({ ...validClass(), ...values }).valid,
        true,
      );
    }
  });
});

test('edit forms send only changed fields', () => {
  const detail = {
    id: 7,
    course: { id: 1, code: 'COS30043', name: 'Interface' },
    term: '2026-S2',
    section: 'A',
    lecturer: { id: 2, name: 'Lecturer One' },
    room_label: 'EN402',
    latitude: '-37.822100',
    longitude: '145.038900',
    radius_m: '50.00',
    has_class_sessions: true,
  };
  const original = classFormValues(detail);
  const unchanged = validateClassForm(original).payload;
  assert.deepEqual(changedFields(unchanged, original), {});
  const edited = validateClassForm({
    ...original,
    room_label: 'EN403',
    radius_m: '75',
  }).payload;
  assert.deepEqual(changedFields(edited, original), {
    room_label: 'EN403',
    radius_m: 75,
  });
  assert.deepEqual(
    changedFields(
      { code: 'COS30043', name: 'New' },
      {
        id: 1,
        code: 'COS30043',
        name: 'Old',
      },
    ),
    { name: 'New' },
  );
});

test('list paths validate paging and encode search', () => {
  assert.equal(buildOptionsPath('/courses'), '/courses');
  assert.equal(
    buildOptionsPath('/courses', { page: 2, limit: 100, q: ' cos & 1 ' }),
    '/courses?page=2&limit=100&q=cos+%26+1',
  );
  assert.equal(buildOptionsPath('/lecturers', { q: '   ' }), '/lecturers');
  assert.throws(() => buildOptionsPath('/courses', { page: 0 }), RangeError);
  assert.throws(() => buildOptionsPath('/courses', { limit: 101 }), RangeError);
  assert.throws(
    () => buildOptionsPath('/courses', { q: 'x'.repeat(101) }),
    RangeError,
  );
});

test('services use the agreed paths, methods and response checks', async () => {
  const course = { id: 9, code: 'TST1', name: 'Test' };
  const api = fakeApi((path, { method = 'GET' }) =>
    method === 'GET' && !/\/classes\/\d+$/.test(path)
      ? { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      : { data: path.startsWith('/classes') ? { id: 7 } : course },
  );
  const courses = createCoursesService({ api });
  const lecturers = createLecturersService({ api });
  const classes = createClassManagementService({ api });
  const signal = new AbortController().signal;

  await courses.list({ q: 'cos' }, { signal });
  await courses.create({ code: 'TST1', name: 'Test' });
  await courses.update('9', { name: 'Test' });
  await lecturers.list({ limit: 100 });
  await classes.get(7);
  await classes.create({ course_id: 1 });
  await classes.update(7, { room_label: 'X' });
  assert.deepEqual(
    api.requests.map(([path, options]) => [path, options.method ?? 'GET']),
    [
      ['/courses?q=cos', 'GET'],
      ['/courses', 'POST'],
      ['/courses/9', 'PATCH'],
      ['/lecturers?limit=100', 'GET'],
      ['/classes/7', 'GET'],
      ['/classes', 'POST'],
      ['/classes/7', 'PATCH'],
    ],
  );
  assert.equal(api.requests[0][1].signal, signal);
  assert.deepEqual(api.requests[2][1].body, { name: 'Test' });

  await assert.rejects(() => classes.get('abc'), RangeError);
  await assert.rejects(() => courses.update(0, {}), RangeError);
  const broken = createCoursesService({ api: fakeApi(() => ({ data: {} })) });
  await assert.rejects(
    () => broken.create({}),
    (error) => error.code === 'INVALID_RESPONSE',
  );
});

test('listAll follows pages until totalPages', async () => {
  const pages = [];
  const rows = await listAll(async ({ page, limit }) => {
    pages.push([page, limit]);
    return {
      data: [{ id: page }],
      meta: { page, limit, total: 3, totalPages: 3 },
    };
  });
  assert.deepEqual(pages, [
    [1, 100],
    [2, 100],
    [3, 100],
  ]);
  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  const empty = await listAll(async () => ({
    data: [],
    meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
  }));
  assert.deepEqual(empty, []);
});

test('server errors map to field messages', async (t) => {
  const error = (code, fields = {}, status = 409) =>
    new ApiError('Server message', { status, code, fields });
  await t.test('duplicate course code', () => {
    const mapped = formErrorsFrom(error('COURSE_CODE_TAKEN', { code: 'x' }));
    assert.ok(mapped.fields.code);
    assert.match(mapped.message, /already uses this code/);
  });
  await t.test('duplicate section', () => {
    assert.ok(formErrorsFrom(error('CLASS_SECTION_TAKEN')).fields.section);
  });
  await t.test('ineligible lecturer', () => {
    assert.ok(
      formErrorsFrom(error('LECTURER_NOT_ELIGIBLE', {}, 422)).fields
        .lecturer_id,
    );
  });
  await t.test('frozen identity keeps the server field names', () => {
    const mapped = formErrorsFrom(
      error('CLASS_HAS_SESSIONS', { term: 'Cannot change.' }),
    );
    assert.deepEqual(mapped.fields, { term: 'Cannot change.' });
    assert.match(mapped.message, /scheduled/);
  });
  await t.test('validation errors pass fields through', () => {
    const mapped = formErrorsFrom(
      error('VALIDATION_ERROR', { latitude: 'Out of range.' }, 422),
    );
    assert.deepEqual(mapped.fields, { latitude: 'Out of range.' });
    assert.match(mapped.message, /highlighted/);
  });
  await t.test('expired CSRF and network errors', () => {
    assert.match(
      formErrorsFrom(error('CSRF_INVALID', {}, 403)).message,
      /retry|again/i,
    );
    assert.equal(
      formErrorsFrom(
        new ApiError('Cannot reach the server.', { code: 'NETWORK_ERROR' }),
      ).message,
      'Cannot reach the server.',
    );
  });
});

test('paged list ignores outdated responses and resets to page 1', async () => {
  const pending = [];
  const list = usePagedList(
    (params, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
        pending.push({ params, resolve });
      }),
    { limit: 5, filters: () => ({ q: 'x' }) },
  );
  const first = list.load();
  const second = list.load();
  pending[1].resolve({
    data: [{ id: 2 }],
    meta: { page: 1, limit: 5, total: 6, totalPages: 2 },
  });
  await Promise.all([first, second]);
  assert.deepEqual(list.rows.value, [{ id: 2 }]);
  assert.deepEqual(pending[1].params, { page: 1, limit: 5, q: 'x' });
  assert.equal(list.loading.value, false);
  assert.equal(list.error.value, null);

  const next = list.setPage(2);
  pending[2].resolve({
    data: [{ id: 6 }],
    meta: { page: 2, limit: 5, total: 6, totalPages: 2 },
  });
  await next;
  assert.equal(list.page.value, 2);
  assert.equal(list.setPage(3), undefined);

  const again = list.reload();
  assert.equal(pending[3].params.page, 1);
  pending[3].resolve({
    data: [],
    meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
  });
  await again;
  assert.deepEqual(list.rows.value, []);
});
