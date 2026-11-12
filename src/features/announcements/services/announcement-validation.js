// Client-side checks that mirror backend #36 (backend/docs/api/announcements.md).
// The server re-validates everything; these only give earlier feedback.
import { CATEGORIES } from './announcement-options.js';

export const MAX_TITLE = 150;
export const MAX_BODY = 5000;
export const MAX_COMMENT = 1000;
const MAX_ID = 4294967295;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Checks the form values and returns { valid, errors, payload }. In edit mode
// the class cannot change, so `requireClass` is false and the payload has no
// class_id. The payload holds the trimmed values that are sent to the server.
export function validateAnnouncementForm(values = {}, { requireClass } = {}) {
  const errors = {};
  const payload = {};

  if (requireClass) {
    const raw =
      typeof values.class_id === 'number'
        ? String(values.class_id)
        : text(values.class_id);
    const id = /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(id) || id > MAX_ID)
      errors.class_id = 'Select a class.';
    else payload.class_id = id;
  }

  if (!CATEGORIES.some((item) => item.value === values.category))
    errors.category = 'Select a category.';
  else payload.category = values.category;

  const title = text(values.title);
  if (!title) errors.title = 'Title is required.';
  else if (title.length > MAX_TITLE)
    errors.title = `Title must be at most ${MAX_TITLE} characters.`;
  else payload.title = title;

  const body = text(values.body);
  if (!body) errors.body = 'Body is required.';
  else if (body.length > MAX_BODY)
    errors.body = `Body must be at most ${MAX_BODY} characters.`;
  else payload.body = body;

  return { valid: Object.keys(errors).length === 0, errors, payload };
}

// The fields of `payload` that differ from the saved post. An edit sends only
// these, and sends nothing when the result is empty.
export function changedAnnouncementFields(payload, original) {
  const changes = {};
  for (const field of ['category', 'title', 'body']) {
    if (payload[field] !== undefined && payload[field] !== original?.[field])
      changes[field] = payload[field];
  }
  return changes;
}

// Characters left for the counter under the body field. Negative when too long.
export function charactersLeft(value, max = MAX_BODY) {
  return max - text(value).length;
}

// A comment is plain text of 1 to 1000 characters after trimming. Returns
// { valid, error, body }, where `body` is the trimmed text to send.
export function validateComment(value) {
  const body = text(value);
  if (!body) return { valid: false, error: 'Write a comment first.', body };
  if (body.length > MAX_COMMENT)
    return {
      valid: false,
      error: `Comment must be at most ${MAX_COMMENT} characters.`,
      body,
    };
  return { valid: true, error: '', body };
}
