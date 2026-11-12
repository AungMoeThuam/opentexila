// Shared choices and helpers for the announcement pages. The categories and
// sort values match backend/docs/api/announcements.md.

// Status colours always come with the label text, never colour alone.
export const CATEGORIES = [
  { value: 'general', label: 'General', statusClass: '' },
  {
    value: 'class_change',
    label: 'Class change',
    statusClass: 'ot-status--live',
  },
  { value: 'reminder', label: 'Reminder', statusClass: 'ot-status--late' },
  { value: 'exam', label: 'Exam', statusClass: 'ot-status--absent' },
];

export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_liked', label: 'Most liked' },
];

export function categoryInfo(value) {
  return (
    CATEGORIES.find((category) => category.value === value) ?? CATEGORIES[0]
  );
}

// Route names for each role. Every name is registered in ../routes.js.
export const ROLE_ROUTES = {
  student: {
    feed: 'student-announcements',
    detail: 'student-announcement',
  },
  lecturer: {
    feed: 'lecturer-announcements',
    detail: 'lecturer-announcement',
    create: 'lecturer-announcement-new',
    edit: 'lecturer-announcement-edit',
  },
  admin: {
    feed: 'admin-announcements',
    detail: 'admin-announcement',
  },
};

export const FEED_SUBTITLE = {
  student: 'News from the classes you are enrolled in.',
  lecturer: 'News posted in the classes you teach.',
  admin: 'News from every class.',
};

// "COS30043 · Section A · 2026-S2". Works for a class summary or a post's class.
export function classLabel(classInfo) {
  if (!classInfo) return '';
  return [
    classInfo.course?.code,
    classInfo.section ? `Section ${classInfo.section}` : '',
    classInfo.term,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Cuts long text at a word boundary. The text itself stays plain text.
export function excerpt(text, max = 220) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function isEdited(announcement) {
  const created = new Date(announcement?.created_at).getTime();
  const updated = new Date(announcement?.updated_at).getTime();
  return (
    Number.isFinite(created) && Number.isFinite(updated) && updated > created
  );
}

export const plural = (count, one, many) =>
  `${count} ${count === 1 ? one : many}`;
