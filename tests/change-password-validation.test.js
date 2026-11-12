import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateChangePassword } from '../src/features/auth/composables/change-password-validation.js';

const validForm = {
  current_password: 'OldPassword123!',
  new_password: 'NewPassword456!',
  confirm_password: 'NewPassword456!',
};

test('accepts a valid password change', () => {
  assert.deepEqual(validateChangePassword(validForm), {});
});

test('requires all three password fields', () => {
  const errors = validateChangePassword({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  assert.ok(errors.current_password);
  assert.ok(errors.new_password);
  assert.ok(errors.confirm_password);
});

test('requires the new password to have at least 12 characters', () => {
  const errors = validateChangePassword({
    ...validForm,
    new_password: 'Short123!',
    confirm_password: 'Short123!',
  });

  assert.ok(errors.new_password);
});

test('rejects passwords longer than 1024 characters', () => {
  const password = 'A'.repeat(1025);

  const errors = validateChangePassword({
    ...validForm,
    new_password: password,
    confirm_password: password,
  });

  assert.ok(errors.new_password);
});

test('accepts a new password of exactly 1024 characters', () => {
  const password = 'A'.repeat(1024);

  assert.deepEqual(
    validateChangePassword({
      ...validForm,
      new_password: password,
      confirm_password: password,
    }),
    {},
  );
});

test('rejects reusing the current password', () => {
  const errors = validateChangePassword({
    ...validForm,
    new_password: validForm.current_password,
    confirm_password: validForm.current_password,
  });

  assert.ok(errors.new_password);
});

test('rejects a mismatched confirmation password', () => {
  const errors = validateChangePassword({
    ...validForm,
    confirm_password: 'DifferentPassword123!',
  });

  assert.ok(errors.confirm_password);
});
