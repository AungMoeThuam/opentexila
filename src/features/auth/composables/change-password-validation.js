export function validateChangePassword(form) {
  const errors = {};

  if (!form.current_password) {
    errors.current_password = 'Current password is required.';
  }

  if (!form.new_password) {
    errors.new_password = 'New password is required.';
  } else if (form.new_password.length < 12) {
    errors.new_password = 'Password must be at least 12 characters.';
  } else if (form.new_password.length > 1024) {
    errors.new_password = 'Password must not exceed 1024 characters.';
  } else if (form.new_password === form.current_password) {
    errors.new_password =
      'New password must be different from current password.';
  }

  if (!form.confirm_password) {
    errors.confirm_password = 'Please confirm your new password.';
  } else if (form.confirm_password !== form.new_password) {
    errors.confirm_password = 'Passwords do not match.';
  }

  return errors;
}
