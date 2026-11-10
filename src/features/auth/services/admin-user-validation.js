// Validation and password helpers for the admin account page.
// Limits match backend/docs/api/auth.md (POST /admin/users).

export const ACCOUNT_ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'lecturer', label: 'Lecturer' },
];
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 1024;
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Passwords are never trimmed or changed; only their length is checked.
export function passwordError(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (value.length > MAX_PASSWORD_LENGTH)
    return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  return '';
}

export function validateAccountForm(form) {
  const errors = {};
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const email =
    typeof form.email === 'string' ? form.email.trim().toLowerCase() : '';
  if (!name) errors.name = 'Enter the full name.';
  else if (name.length > MAX_NAME)
    errors.name = `Use at most ${MAX_NAME} characters.`;
  if (!email) errors.email = 'Enter an email address.';
  else if (email.length > MAX_EMAIL || !EMAIL.test(email))
    errors.email = 'Enter a valid email address.';
  if (!ACCOUNT_ROLES.some((role) => role.value === form.role))
    errors.role = 'Select Student or Lecturer.';
  const password = passwordError(form.temporary_password);
  if (password) errors.temporary_password = password;
  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    payload: valid
      ? {
          name,
          email,
          role: form.role,
          temporary_password: form.temporary_password,
        }
      : null,
  };
}

// Letters and digits without look-alike characters (0/O, 1/l/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// Uses rejection sampling so every character is equally likely.
export function generateTemporaryPassword(
  length = 16,
  getRandomValues = (bytes) => globalThis.crypto.getRandomValues(bytes),
) {
  const limit = 256 - (256 % ALPHABET.length);
  let result = '';
  while (result.length < length) {
    const bytes = getRandomValues(new Uint8Array(length * 2));
    for (const byte of bytes) {
      if (byte < limit && result.length < length)
        result += ALPHABET[byte % ALPHABET.length];
    }
  }
  return result;
}
