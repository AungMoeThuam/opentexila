// Helpers for the admin class attendance pages.

// "COS30043 · Section A · 2026-S2" for the class picker.
export function classOptionLabel(classInfo) {
  if (!classInfo) return '';
  return [
    classInfo.course?.code,
    classInfo.section ? `Section ${classInfo.section}` : '',
    classInfo.term,
  ]
    .filter(Boolean)
    .join(' · ');
}

// A roster exists once the session has started. A cancelled session can still
// hold records from before it was cancelled.
export function canViewRoster(session) {
  return session?.availability !== 'upcoming';
}

// Counts of one session as a single line of text.
export function attendanceLine(attendance = {}) {
  const { present = 0, late = 0, absent = 0, pending = 0 } = attendance;
  return `Present ${present} · Late ${late} · Absent ${absent} · Pending ${pending}`;
}

// An ended session whose students are still pending has not been finalised by
// the lecturer yet (there is no automatic finalisation).
export function needsFinalising(session) {
  return (
    session?.state === 'scheduled' &&
    session?.availability === 'ended' &&
    (session?.attendance?.pending ?? 0) > 0
  );
}

// The class ID in the address, or '' when it is missing or not a positive integer.
export function classIdFromQuery(value) {
  const text = Array.isArray(value) ? value[0] : value;
  return /^[1-9]\d{0,9}$/.test(String(text ?? '')) && Number(text) <= 4294967295
    ? String(text)
    : '';
}
