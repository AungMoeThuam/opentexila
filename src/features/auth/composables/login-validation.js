export function validateLogin({ email, password }) {
  const errors = {};
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';

  if (!normalizedEmail) {
    errors.email = 'Email is required.';
  } else if (normalizedEmail.length > 254) {
    errors.email = 'Email must be 254 characters or fewer.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (typeof password !== 'string' || !password) {
    errors.password = 'Password is required.';
  } else if (password.length > 1024) {
    errors.password = 'Password must be 1024 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      email: normalizedEmail,
      password,
    },
  };
}
