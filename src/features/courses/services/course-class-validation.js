// Client-side checks that mirror backend #18 (docs/api/courses-classes.md).
// The server re-validates everything; these only give earlier feedback.

export const MIN_RADIUS_M = 1;
// Provisional backend limit (MAX_RADIUS_M); keep in sync with the API doc.
export const MAX_RADIUS_M = 1000;
const MAX_ID = 4294967295;
const CODE_PATTERN = /^[\x21-\x7E]+$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function requiredText(value, label, max, errors, key) {
  const trimmed = text(value);
  if (!trimmed) errors[key] = `${label} is required.`;
  else if (trimmed.length > max)
    errors[key] = `${label} must be at most ${max} characters.`;
  return trimmed;
}

function requiredCode(value, label, max, errors, key) {
  const code = text(value).toUpperCase();
  if (!code) errors[key] = `${label} is required.`;
  else if (code.length > max || !CODE_PATTERN.test(code))
    errors[key] =
      `${label} must be up to ${max} letters, digits or symbols with no spaces.`;
  return code;
}

function requiredId(value, label, errors, key) {
  const raw = typeof value === 'number' ? String(value) : text(value);
  const id = /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id > MAX_ID)
    errors[key] = `Select a ${label}.`;
  return id;
}

function requiredNumber(value, label, min, max, errors, key, unit = '') {
  const raw = typeof value === 'number' ? String(value) : text(value);
  const number = raw === '' ? NaN : Number(raw);
  if (raw === '') errors[key] = `${label} is required.`;
  else if (!Number.isFinite(number) || number < min || number > max)
    errors[key] = `${label} must be a number from ${min} to ${max}${unit}.`;
  return number;
}

const result = (errors, payload) => ({
  valid: Object.keys(errors).length === 0,
  errors,
  payload,
});

export function validateCourseForm(values = {}) {
  const errors = {};
  const payload = {
    code: requiredCode(values.code, 'Course code', 30, errors, 'code'),
    name: requiredText(values.name, 'Course name', 150, errors, 'name'),
  };
  return result(errors, payload);
}

export function validateClassForm(values = {}) {
  const errors = {};
  const payload = {
    course_id: requiredId(values.course_id, 'course', errors, 'course_id'),
    term: requiredText(values.term, 'Term', 50, errors, 'term'),
    section: requiredCode(values.section, 'Section', 30, errors, 'section'),
    lecturer_id: requiredId(
      values.lecturer_id,
      'lecturer',
      errors,
      'lecturer_id',
    ),
    room_label: requiredText(
      values.room_label,
      'Room',
      100,
      errors,
      'room_label',
    ),
    latitude: requiredNumber(
      values.latitude,
      'Latitude',
      -90,
      90,
      errors,
      'latitude',
    ),
    longitude: requiredNumber(
      values.longitude,
      'Longitude',
      -180,
      180,
      errors,
      'longitude',
    ),
    radius_m: requiredNumber(
      values.radius_m,
      'Attendance radius',
      MIN_RADIUS_M,
      MAX_RADIUS_M,
      errors,
      'radius_m',
      ' metres',
    ),
  };
  return result(errors, payload);
}

// Fields whose value differs from the saved record. Numbers from the API are
// decimal strings ("50.00"), so compare numerically.
export function changedFields(payload, original) {
  const changes = {};
  for (const [key, value] of Object.entries(payload)) {
    const before = original?.[key];
    const same =
      typeof value === 'number'
        ? Number(before) === value
        : String(before ?? '') === value;
    if (!same) changes[key] = value;
  }
  return changes;
}

// Values the class form edits, read from a GET /classes/:classId response.
export function classFormValues(detail) {
  return {
    course_id: detail?.course?.id ?? '',
    term: detail?.term ?? '',
    section: detail?.section ?? '',
    lecturer_id: detail?.lecturer?.id ?? '',
    room_label: detail?.room_label ?? '',
    latitude: detail?.latitude ?? '',
    longitude: detail?.longitude ?? '',
    radius_m: detail?.radius_m ?? '',
  };
}
