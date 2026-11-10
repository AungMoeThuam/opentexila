import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTemporaryPassword,
  passwordError,
  validateAccountForm,
} from '../src/features/auth/services/admin-user-validation.js';
import {
  buildUsersPath,
  createAdminUsersService,
} from '../src/features/auth/services/admin-users-service.js';
import {
  createAccountErrors,
  resetPasswordErrors,
} from '../src/features/auth/services/admin-user-errors.js';
import { useCreateAccount } from '../src/features/auth/composables/use-create-account.js';
import { useResetPassword } from '../src/features/auth/composables/use-reset-password.js';
import { ApiError } from '../src/shared/services/api-client.js';
import {
  publicAuthRoutes,
  protectedAuthRoutes,
} from '../src/features/auth/routes.js';
import { navigationForRole } from '../src/layouts/navigation.js';

const PASSWORD = 'Temporary-pass-1';
const validForm = () => ({
  name: ' Student Two ',
  email: ' Student.Two@Example.COM ',
  role: 'student',
  temporary_password: PASSWORD,
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
const apiError = (status, code, fields = {}) =>
  new ApiError('Server message.', { status, code, fields });

test('account form validation trims, lower-cases and checks each field', async (t) => {
  await t.test('valid input becomes the request body', () => {
    const result = validateAccountForm(validForm());
    assert.equal(result.valid, true);
    assert.deepEqual(result.payload, {
      name: 'Student Two',
      email: 'student.two@example.com',
      role: 'student',
      temporary_password: PASSWORD,
    });
  });

  await t.test('each invalid field gets its own message', () => {
    const result = validateAccountForm({
      name: '   ',
      email: 'not-an-email',
      role: 'admin',
      temporary_password: 'short',
    });
    assert.equal(result.valid, false);
    assert.equal(result.payload, null);
    assert.deepEqual(Object.keys(result.errors).sort(), [
      'email',
      'name',
      'role',
      'temporary_password',
    ]);
  });

  await t.test('length limits match the API contract', () => {
    assert.ok(
      validateAccountForm({ ...validForm(), name: 'n'.repeat(101) }).errors
        .name,
    );
    assert.equal(
      validateAccountForm({ ...validForm(), name: 'n'.repeat(100) }).errors
        .name,
      undefined,
    );
    assert.ok(
      validateAccountForm({ ...validForm(), email: `${'a'.repeat(250)}@x.io` })
        .errors.email,
    );
    assert.equal(passwordError('x'.repeat(11)) !== '', true);
    assert.equal(passwordError('x'.repeat(12)), '');
    assert.equal(passwordError('x'.repeat(1024)), '');
    assert.notEqual(passwordError('x'.repeat(1025)), '');
  });

  await t.test('the password is never trimmed', () => {
    const result = validateAccountForm({
      ...validForm(),
      temporary_password: '  spaces inside  ',
    });
    assert.equal(result.payload.temporary_password, '  spaces inside  ');
  });
});

test('generated temporary passwords are long, varied and unambiguous', () => {
  const first = generateTemporaryPassword();
  assert.equal(first.length, 16);
  assert.equal(passwordError(first), '');
  assert.match(first, /^[A-HJ-NP-Za-km-z2-9]+$/);
  assert.notEqual(first, generateTemporaryPassword());
  assert.equal(generateTemporaryPassword(24).length, 24);
  // Bytes at or above the sampling limit are skipped, not wrapped.
  let calls = 0;
  const skipped = generateTemporaryPassword(4, (bytes) => {
    calls += 1;
    bytes.fill(calls === 1 ? 255 : 0);
    return bytes;
  });
  assert.equal(skipped, 'AAAA');
  assert.equal(calls, 2);
});

test('buildUsersPath validates and encodes the list query', () => {
  assert.equal(buildUsersPath(), '/admin/users');
  assert.equal(
    buildUsersPath({ page: 2, limit: 10, search: ' a&b ', role: 'lecturer' }),
    '/admin/users?page=2&limit=10&search=a%26b&role=lecturer',
  );
  assert.equal(buildUsersPath({ search: '   ', role: '' }), '/admin/users');
  for (const bad of [
    { page: 0 },
    { limit: 101 },
    { limit: 'abc' },
    { role: 'teacher' },
    { search: 'a'.repeat(101) },
  ])
    assert.throws(() => buildUsersPath(bad), RangeError);
});

test('admin users service calls the endpoints and checks responses', async (t) => {
  await t.test('list returns the page and requires meta', async () => {
    const page = {
      data: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const api = fakeApi(() => page);
    const service = createAdminUsersService({ api });
    const signal = new AbortController().signal;
    assert.deepEqual(
      await service.list({ page: 1, search: 'x' }, { signal }),
      page,
    );
    assert.equal(api.requests[0][0], '/admin/users?page=1&search=x');
    assert.equal(api.requests[0][1].signal, signal);
    const broken = createAdminUsersService({
      api: fakeApi(() => ({ data: [] })),
    });
    await assert.rejects(broken.list(), { code: 'INVALID_RESPONSE' });
  });

  await t.test('create posts the body and returns the account', async () => {
    const created = { id: 12, name: 'Student Two', role: 'student' };
    const api = fakeApi(() => ({ data: created }));
    const service = createAdminUsersService({ api });
    const body = validateAccountForm(validForm()).payload;
    assert.deepEqual(await service.create(body), created);
    assert.deepEqual(api.requests[0], [
      '/admin/users',
      { method: 'POST', body, signal: undefined },
    ]);
    const broken = createAdminUsersService({
      api: fakeApi(() => ({ data: {} })),
    });
    await assert.rejects(broken.create(body), { code: 'INVALID_RESPONSE' });
  });

  await t.test('reset posts to the user path and expects no body', async () => {
    const api = fakeApi(() => null);
    const service = createAdminUsersService({ api });
    assert.equal(
      await service.resetPassword('5', { temporary_password: PASSWORD }),
      undefined,
    );
    assert.equal(api.requests[0][0], '/admin/users/5/reset-password');
    assert.equal(api.requests[0][1].method, 'POST');
    await assert.rejects(service.resetPassword('../5', {}), RangeError);
    await assert.rejects(service.resetPassword(0, {}), RangeError);
  });
});

test('API errors become form and dialog messages', () => {
  const duplicate = createAccountErrors(
    apiError(409, 'EMAIL_ALREADY_EXISTS', { email: 'In use.' }),
  );
  assert.equal(duplicate.fields.email, 'In use.');
  assert.match(duplicate.message, /already exists/);
  assert.ok(
    createAccountErrors(apiError(409, 'EMAIL_ALREADY_EXISTS')).fields.email,
  );
  assert.deepEqual(
    createAccountErrors(
      apiError(422, 'VALIDATION_ERROR', { role: 'Bad role.' }),
    ).fields,
    { role: 'Bad role.' },
  );
  assert.match(
    createAccountErrors(apiError(403, 'CSRF_INVALID')).message,
    /try again/,
  );
  assert.equal(createAccountErrors(new Error('Boom')).message, 'Boom');

  assert.match(
    resetPasswordErrors(apiError(404, 'RESOURCE_NOT_FOUND')).message,
    /no longer exists/,
  );
  assert.match(
    resetPasswordErrors(apiError(403, 'FORBIDDEN')).message,
    /admin/i,
  );
  assert.equal(
    resetPasswordErrors(
      apiError(422, 'VALIDATION_ERROR', { temporary_password: 'Too short.' }),
    ).message,
    'Too short.',
  );
});

test('useCreateAccount validates, submits once and clears the password', async (t) => {
  await t.test('invalid input sends nothing', async () => {
    const calls = [];
    const state = useCreateAccount({
      service: { create: async (b) => calls.push(b) },
    });
    const result = await state.submit();
    assert.deepEqual(result, { status: 'invalid' });
    assert.deepEqual(calls, []);
    assert.ok(state.errors.value.name);
    assert.equal(state.notice.value.tone, 'error');
  });

  await t.test(
    'success returns the password once and empties the form',
    async () => {
      const calls = [];
      const state = useCreateAccount({
        service: {
          create: async (body) => {
            calls.push(body);
            return {
              id: 12,
              name: body.name,
              email: body.email,
              role: body.role,
            };
          },
        },
      });
      Object.assign(state.form, validForm());
      const result = await state.submit();
      assert.equal(result.status, 'created');
      assert.equal(result.password, PASSWORD);
      assert.equal(result.user.email, 'student.two@example.com');
      assert.equal(JSON.stringify(result.user).includes(PASSWORD), false);
      assert.equal(state.form.temporary_password, '');
      assert.equal(state.form.name, '');
      assert.equal(calls.length, 1);
      assert.equal(state.saving.value, false);
    },
  );

  await t.test('two quick submits send one request', async () => {
    let release;
    let count = 0;
    const state = useCreateAccount({
      service: {
        create: () => {
          count += 1;
          return new Promise((resolve) => {
            release = () =>
              resolve({ id: 1, name: 'A', email: 'a@x.io', role: 'student' });
          });
        },
      },
    });
    Object.assign(state.form, validForm());
    const first = state.submit();
    assert.equal(state.saving.value, true);
    assert.equal(await state.submit(), null);
    release();
    assert.equal((await first).status, 'created');
    assert.equal(count, 1);
  });

  await t.test(
    'a duplicate email keeps the form and marks the field',
    async () => {
      const state = useCreateAccount({
        service: {
          create: async () => {
            throw apiError(409, 'EMAIL_ALREADY_EXISTS');
          },
        },
      });
      Object.assign(state.form, validForm());
      assert.deepEqual(await state.submit(), { status: 'failed' });
      assert.ok(state.errors.value.email);
      assert.equal(state.form.temporary_password, PASSWORD);
      assert.equal(state.saving.value, false);
    },
  );

  await t.test('FORBIDDEN is reported so the page can leave', async () => {
    const state = useCreateAccount({
      service: {
        create: async () => {
          throw apiError(403, 'FORBIDDEN');
        },
      },
    });
    Object.assign(state.form, validForm());
    assert.deepEqual(await state.submit(), { status: 'forbidden' });
  });
});

test('useResetPassword opens, validates, resets and clears', async (t) => {
  const user = {
    id: 5,
    name: 'Student Two',
    email: 's2@x.io',
    role: 'student',
    extra: 'x',
  };

  await t.test('open stores only the fields the dialog needs', () => {
    const state = useResetPassword({ service: {} });
    state.open(user);
    assert.deepEqual(state.target.value, {
      id: 5,
      name: 'Student Two',
      email: 's2@x.io',
      role: 'student',
    });
    assert.equal(state.password.value, '');
  });

  await t.test('a short password sends nothing', async () => {
    const calls = [];
    const state = useResetPassword({
      service: { resetPassword: async (...a) => calls.push(a) },
    });
    state.open(user);
    state.password.value = 'short';
    assert.deepEqual(await state.submit(), { status: 'invalid' });
    assert.ok(state.fieldError.value);
    assert.deepEqual(calls, []);
  });

  await t.test('success returns the password once and closes', async () => {
    const calls = [];
    const state = useResetPassword({
      service: { resetPassword: async (...a) => calls.push(a) },
    });
    state.open(user);
    state.password.value = PASSWORD;
    const result = await state.submit();
    assert.equal(result.status, 'reset');
    assert.equal(result.password, PASSWORD);
    assert.equal(result.user.id, 5);
    assert.deepEqual(calls, [[5, { temporary_password: PASSWORD }]]);
    assert.equal(state.target.value, null);
    assert.equal(state.password.value, '');
  });

  await t.test(
    'an unknown user shows a message and keeps the dialog open',
    async () => {
      const state = useResetPassword({
        service: {
          resetPassword: async () => {
            throw apiError(404, 'RESOURCE_NOT_FOUND');
          },
        },
      });
      state.open(user);
      state.password.value = PASSWORD;
      assert.deepEqual(await state.submit(), { status: 'failed' });
      assert.match(state.error.value, /no longer exists/);
      assert.ok(state.target.value);
      assert.equal(state.busy.value, false);
    },
  );

  await t.test('close is ignored while a request runs', async () => {
    let release;
    const state = useResetPassword({
      service: {
        resetPassword: () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      },
    });
    state.open(user);
    state.password.value = PASSWORD;
    const pending = state.submit();
    state.close();
    assert.ok(state.target.value);
    assert.equal(await state.submit(), null);
    release();
    assert.equal((await pending).status, 'reset');
  });
});

test('the invitations route and menu link are admin-only "Create account"', () => {
  const route = protectedAuthRoutes.find((r) => r.name === 'invitations');
  assert.equal(route.path, 'admin/invitations');
  assert.deepEqual(route.meta.roles, ['admin']);
  assert.equal(typeof route.component, 'function');
  assert.ok(!publicAuthRoutes.some((r) => r.name === 'invitations'));
  const link = navigationForRole('admin').find(
    (item) => item.to === '/admin/invitations',
  );
  assert.equal(link.label, 'Create account');
  for (const role of ['student', 'lecturer'])
    assert.ok(
      !navigationForRole(role).some((item) => item.to === '/admin/invitations'),
    );
});
