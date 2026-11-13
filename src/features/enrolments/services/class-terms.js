// The terms to offer in the Term filter, taken from the classes themselves
// (there is no list of terms in the API). Each term appears once, however it
// is spelled: "2026 s2", "2026-S2" and "2026S2" are one term, shown with the
// spelling of the newest class. Sorted for the list.

const looseKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[\s\-_.]+/g, '');

const tidy = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

// `classes` have `id` and `term`.
export function distinctTerms(classes) {
  const byKey = new Map();
  for (const item of classes) {
    const term = tidy(item?.term);
    if (!term) continue;
    const key = looseKey(term);
    const known = byKey.get(key);
    if (!known || item.id > known.id) byKey.set(key, { term, id: item.id });
  }
  return [...byKey.values()]
    .map((entry) => entry.term)
    .sort((a, b) => a.localeCompare(b));
}
