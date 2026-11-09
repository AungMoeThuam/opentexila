// Turns an API error into a form-level message plus per-field messages.
// Field keys match the request body (code, section, lecturer_id, ...).

const FRIENDLY = {
  COURSE_CODE_TAKEN: {
    message: 'Another course already uses this code.',
    fields: { code: 'This course code is already in use.' },
  },
  CLASS_SECTION_TAKEN: {
    message: 'This course already has this section in this term.',
    fields: {
      section: 'This section already exists for the course in this term.',
    },
  },
  LECTURER_NOT_ELIGIBLE: {
    message: 'The selected lecturer cannot be assigned.',
    fields: { lecturer_id: 'Select an active lecturer.' },
  },
  CLASS_HAS_SESSIONS: {
    message:
      'Course, term and section cannot change after class sessions have been scheduled.',
  },
};

export function formErrorsFrom(cause) {
  const known = FRIENDLY[cause?.code];
  const serverFields =
    cause?.fields && typeof cause.fields === 'object' ? cause.fields : {};
  const fields = { ...serverFields, ...(known?.fields ?? {}) };
  let message = known?.message;
  if (!message) {
    if (cause?.code === 'CSRF_INVALID')
      message = 'Your security token expired. Please try saving again.';
    else if (cause?.code === 'VALIDATION_ERROR' && Object.keys(fields).length)
      message = 'Please correct the highlighted fields.';
    else message = cause?.message || 'The changes could not be saved.';
  }
  return { message, fields };
}
