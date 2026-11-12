// Suggestions for the class form, worked out from the classes that already
// exist: the terms and rooms in use, the next free section, and the class whose
// room (and so location) a new class can copy. Nothing here calls the server.

// Compares text the way a person reads it: case, spaces and dashes do not
// matter, so "2026 s2", "2026-S2" and "2026S2" are one term, and "EN 402",
// "en-402" and "EN402" are one room.
export function looseKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s\-_.]+/g, '');
}

// Trimmed, with runs of spaces made single. Case is kept.
export function tidy(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

// The values a field has in the existing classes, one per loose key, using the
// spelling of the newest class. Sorted for the suggestion list.
// `classes` have `id`, `term`, `room_label`. `excludeId` leaves one class out
// (the class being edited).
export function distinctValues(classes, field, { excludeId } = {}) {
  const byKey = new Map();
  for (const item of classes) {
    if (item.id === excludeId) continue;
    const value = tidy(item[field]);
    if (!value) continue;
    const key = looseKey(value);
    const known = byKey.get(key);
    if (!known || item.id > known.classId)
      byKey.set(key, { value, classId: item.id });
  }
  return [...byKey.values()].sort((a, b) => a.value.localeCompare(b.value));
}

// What the admin typed, written the way an existing value is spelled. A new
// value is only tidied.
export function canonicalValue(input, options) {
  const text = tidy(input);
  const match = options.find(
    (option) => looseKey(option.value) === looseKey(text),
  );
  return match ? match.value : text;
}

// The first unused single-letter section (A to Z) for a course and term, or
// null when there is nothing to suggest.
export function nextFreeSection(classes, { courseId, term, excludeId } = {}) {
  if (!courseId || !tidy(term)) return null;
  const used = new Set(
    classes
      .filter(
        (item) =>
          item.id !== excludeId &&
          item.course?.id === Number(courseId) &&
          looseKey(item.term) === looseKey(term),
      )
      .map((item) => String(item.section ?? '').toUpperCase()),
  );
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter)) return letter;
  }
  return null;
}

// True when another class of this course and term already uses the section.
export function sectionTaken(
  classes,
  { courseId, term, section, excludeId } = {},
) {
  if (!courseId || !tidy(term) || !tidy(section)) return false;
  return classes.some(
    (item) =>
      item.id !== excludeId &&
      item.course?.id === Number(courseId) &&
      looseKey(item.term) === looseKey(term) &&
      looseKey(item.section) === looseKey(section),
  );
}

// The newest other class that uses this room, or null. Its location is the one a
// new class in the same room starts from.
export function roomSource(classes, room, { excludeId } = {}) {
  const key = looseKey(room);
  if (!key) return null;
  let found = null;
  for (const item of classes) {
    if (item.id === excludeId || looseKey(item.room_label) !== key) continue;
    if (!found || item.id > found.id) found = item;
  }
  return found;
}

const asNumber = (value) => {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
};

// True when the form has no usable coordinates yet.
export function locationEmpty(values) {
  return (
    Number.isNaN(asNumber(values.latitude)) ||
    Number.isNaN(asNumber(values.longitude))
  );
}

// True when the form's location equals the other class's (within 0.1 m of
// latitude and longitude, and the same radius).
export function sameLocationAs(values, detail) {
  const close = (a, b) => Math.abs(asNumber(a) - asNumber(b)) < 1e-6;
  return (
    close(values.latitude, detail.latitude) &&
    close(values.longitude, detail.longitude) &&
    asNumber(values.radius_m) === asNumber(detail.radius_m)
  );
}

// The three location values of a class detail, as numbers.
export function locationOf(detail) {
  return {
    latitude: Number(detail.latitude),
    longitude: Number(detail.longitude),
    radius_m: Number(detail.radius_m),
  };
}
