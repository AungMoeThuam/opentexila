// Turns API errors into messages for the account form and the reset dialog.
// Field keys match the request body (name, email, role, temporary_password).

function serverFields(cause) {
  return cause?.fields && typeof cause.fields === 'object' ? cause.fields : {};
}

export function createAccountErrors(cause) {
  const fields = serverFields(cause);
  if (cause?.code === 'EMAIL_ALREADY_EXISTS')
    return {
      message: 'An account with this email already exists.',
      fields: {
        ...fields,
        email: fields.email || 'An account with this email already exists.',
      },
    };
  if (cause?.code === 'CSRF_INVALID')
    return {
      message: 'Your security token expired. Please try again.',
      fields,
    };
  if (cause?.code === 'VALIDATION_ERROR' && Object.keys(fields).length)
    return { message: 'Please correct the highlighted fields.', fields };
  return {
    message: cause?.message || 'The account could not be created.',
    fields,
  };
}

export function resetPasswordErrors(cause) {
  const fields = serverFields(cause);
  if (cause?.code === 'RESOURCE_NOT_FOUND')
    return { message: 'This user no longer exists. Reload the list.', fields };
  if (cause?.code === 'FORBIDDEN')
    return {
      message: 'Passwords of admin accounts cannot be reset here.',
      fields,
    };
  if (cause?.code === 'CSRF_INVALID')
    return {
      message: 'Your security token expired. Please try again.',
      fields,
    };
  if (cause?.code === 'VALIDATION_ERROR' && fields.temporary_password)
    return { message: fields.temporary_password, fields };
  return {
    message: cause?.message || 'The password could not be reset.',
    fields,
  };
}
