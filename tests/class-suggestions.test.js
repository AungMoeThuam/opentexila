import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalValue,
  distinctValues,
  locationEmpty,
  locationOf,
  looseKey,
  nextFreeSection,
  roomSource,
  sameLocationAs,
  sectionTaken,
  tidy,
} from '../src/features/courses/services/class-suggestions.js';

const cls = (id, over = {}) => ({
  id,
  course: { id: 1, code: 'COS30043' },
  section: 'A',
  term: '2026-S2',
  room_label: 'EN402',
  ...over,
});
const classes = [
  cls(1),
  cls(2, { section: 'B', room_label: 'EN 402' }),
  cls(3, {
    course: { id: 2, code: 'COS20007' },
    term: '2026 s2',
    room_label: 'Lab 1',
  }),
  cls(4, { term: '2027-S1', room_label: '' }),
];

test('text is compared ignoring case, spaces and dashes', () => {
  assert.equal(looseKey('2026-S2'), looseKey('2026 s2'));
  assert.equal(looseKey('EN 402'), looseKey('en-402'));
  assert.equal(looseKey('EN402'), 'en402');
  assert.notEqual(looseKey('Room 1'), looseKey('Room 10'));
  assert.equal(looseKey(null), '');
  assert.equal(tidy('  EN   402 '), 'EN 402');
  assert.equal(tidy(undefined), '');
});

test('existing values are listed once, with the newest spelling', () => {
  assert.deepEqual(
    distinctValues(classes, 'term').map((item) => item.value),
    ['2026 s2', '2027-S1'],
    'the term of class 3 (newest) wins over class 1 and 2',
  );
  assert.deepEqual(
    distinctValues(classes, 'room_label').map((item) => item.value),
    ['EN 402', 'Lab 1'],
  );
  assert.deepEqual(
    distinctValues(classes, 'room_label', { excludeId: 3 }).map(
      (item) => item.value,
    ),
    ['EN 402'],
    'the class being edited is left out',
  );
  assert.deepEqual(distinctValues([], 'term'), []);
});

test('a typed value takes the spelling of an existing one', () => {
  const terms = [{ value: '2026-S2', classId: 1 }];
  assert.equal(canonicalValue('2026 s2', terms), '2026-S2');
  assert.equal(canonicalValue('  2026S2 ', terms), '2026-S2');
  assert.equal(canonicalValue('2028-S1', terms), '2028-S1', 'a new term stays');
  assert.equal(canonicalValue('  new   room ', []), 'new room', 'only tidied');
});

test('the next free section is the first unused letter', () => {
  assert.equal(nextFreeSection(classes, { courseId: 1, term: '2026-S2' }), 'C');
  // Course 2 already has section A in this term (class 3, "2026 s2").
  assert.equal(nextFreeSection(classes, { courseId: 2, term: '2026-S2' }), 'B');
  assert.equal(nextFreeSection(classes, { courseId: 3, term: '2026-S2' }), 'A');
  assert.equal(nextFreeSection(classes, { courseId: 1, term: '2028-S1' }), 'A');
  // A class being edited does not count against itself.
  assert.equal(
    nextFreeSection(classes, { courseId: 1, term: '2026-S2', excludeId: 1 }),
    'A',
  );
  assert.equal(
    nextFreeSection(classes, { courseId: '', term: '2026-S2' }),
    null,
  );
  assert.equal(nextFreeSection(classes, { courseId: 1, term: '  ' }), null);
  const full = Array.from({ length: 26 }, (_, index) =>
    cls(100 + index, { section: String.fromCharCode(65 + index) }),
  );
  assert.equal(nextFreeSection(full, { courseId: 1, term: '2026-S2' }), null);
  // Sections such as LAB1 do not block the letters.
  assert.equal(
    nextFreeSection([cls(9, { section: 'LAB1' })], {
      courseId: 1,
      term: '2026-S2',
    }),
    'A',
  );
});

test('a section that is taken is recognised', () => {
  const taken = { courseId: 1, term: '2026 s2', section: 'a' };
  assert.equal(sectionTaken(classes, taken), true);
  assert.equal(sectionTaken(classes, { ...taken, excludeId: 1 }), false);
  assert.equal(sectionTaken(classes, { ...taken, section: 'C' }), false);
  assert.equal(sectionTaken(classes, { ...taken, courseId: 2 }), true);
  assert.equal(sectionTaken(classes, { ...taken, courseId: 3 }), false);
  assert.equal(sectionTaken(classes, { ...taken, section: '' }), false);
});

test('the newest other class in a room is the location source', () => {
  assert.equal(
    roomSource(classes, 'en402').id,
    2,
    'EN 402 and EN402 are one room',
  );
  assert.equal(roomSource(classes, 'Lab 1').id, 3);
  assert.equal(roomSource(classes, 'EN402', { excludeId: 2 }).id, 1);
  assert.equal(roomSource(classes, 'Nowhere'), null);
  assert.equal(roomSource(classes, ''), null);
  assert.equal(roomSource(classes, '   '), null);
});

test('an empty or equal location is told from a different one', () => {
  assert.equal(locationEmpty({ latitude: '', longitude: '' }), true);
  assert.equal(locationEmpty({ latitude: 3.1, longitude: '' }), true);
  assert.equal(
    locationEmpty({ latitude: 0, longitude: 0 }),
    false,
    'zero is a location',
  );
  assert.equal(locationEmpty({ latitude: '3.1', longitude: '101.6' }), false);
  const detail = {
    latitude: '3.121500',
    longitude: '101.656800',
    radius_m: '75.00',
  };
  assert.deepEqual(locationOf(detail), {
    latitude: 3.1215,
    longitude: 101.6568,
    radius_m: 75,
  });
  assert.equal(
    sameLocationAs(
      { latitude: 3.1215, longitude: 101.6568, radius_m: 75 },
      detail,
    ),
    true,
  );
  assert.equal(
    sameLocationAs(
      { latitude: '3.1215', longitude: '101.6568', radius_m: '75' },
      detail,
    ),
    true,
  );
  assert.equal(
    sameLocationAs(
      { latitude: 3.1216, longitude: 101.6568, radius_m: 75 },
      detail,
    ),
    false,
  );
  assert.equal(
    sameLocationAs(
      { latitude: 3.1215, longitude: 101.6568, radius_m: 50 },
      detail,
    ),
    false,
  );
  assert.equal(
    sameLocationAs({ latitude: '', longitude: '', radius_m: '' }, detail),
    false,
  );
});
