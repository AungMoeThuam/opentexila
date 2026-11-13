import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_PAGE_SIZE,
  NEW_TERM,
  classListLocation,
  lastPage,
  listFilterQuery,
  matchingTerm,
  parseId,
  termChoices,
} from '../src/features/courses/services/class-list-query.js';

test('an id in the address is read only when it is a valid id', () => {
  assert.equal(parseId('42'), 42);
  assert.equal(parseId(['7', '8']), 7);
  assert.equal(parseId('4294967295'), 4294967295);
  for (const bad of [
    undefined,
    null,
    '',
    '0',
    '-3',
    '1.5',
    '12abc',
    '4294967296',
    ' 5',
  ])
    assert.equal(parseId(bad), null, String(bad));
});

test('the filters in an address are checked and the rest dropped', () => {
  assert.deepEqual(listFilterQuery({ courseId: '3', term: '2026-S2' }), {
    courseId: '3',
    term: '2026-S2',
  });
  // A term has its spaces tidied; a repeated value uses the first.
  assert.deepEqual(listFilterQuery({ term: ['  2026   S2 ', 'x'] }), {
    term: '2026 S2',
  });
  assert.deepEqual(listFilterQuery({ courseId: 'abc', term: '' }), {});
  assert.deepEqual(listFilterQuery({ term: 'x'.repeat(51) }), {});
  assert.deepEqual(listFilterQuery({ courseId: '3', page: '2', sort: 'x' }), {
    courseId: '3',
  });
  assert.deepEqual(listFilterQuery(), {});
});

test('the list location keeps the filters and can mark a class', () => {
  assert.deepEqual(classListLocation({ courseId: '3', term: '2026-S2' }), {
    name: 'admin-classes',
    query: { courseId: '3', term: '2026-S2' },
  });
  assert.deepEqual(classListLocation({}, { highlight: 12 }), {
    name: 'admin-classes',
    query: { highlight: '12' },
  });
  // An address that came with its own highlight does not pass it on.
  assert.deepEqual(classListLocation({ courseId: '3', highlight: '9' }), {
    name: 'admin-classes',
    query: { courseId: '3' },
  });
  assert.deepEqual(classListLocation(), { name: 'admin-classes', query: {} });
});

test('after a new class the list shows all classes, on the last page', () => {
  const location = classListLocation({}, { highlight: 77, page: 3 });
  assert.deepEqual(location, {
    name: 'admin-classes',
    query: { page: '3', highlight: '77' },
  });
  // The first page needs no page in the address.
  assert.deepEqual(classListLocation({}, { highlight: 5, page: 1 }).query, {
    highlight: '5',
  });
  assert.deepEqual(classListLocation({}, { page: 0 }).query, {});
  assert.deepEqual(classListLocation({}, { page: 'x' }).query, {});
});

test('after an edit the list keeps its filters and its page', () => {
  const location = classListLocation(
    { courseId: '3', term: '2026-S2', page: '2' },
    { highlight: 12, page: 2 },
  );
  assert.deepEqual(location.query, {
    courseId: '3',
    term: '2026-S2',
    page: '2',
    highlight: '12',
  });
});

test('a new class is on the last page of the list', () => {
  assert.equal(CLASS_PAGE_SIZE, 20);
  assert.equal(lastPage(0), 1);
  assert.equal(lastPage(1), 1);
  assert.equal(lastPage(20), 1);
  assert.equal(lastPage(21), 2);
  assert.equal(lastPage(40), 2);
  assert.equal(lastPage(41), 3);
  assert.equal(lastPage(10, 5), 2);
});

const classes = [
  { id: 1, term: '2026-S2' },
  { id: 2, term: '2026 s2' },
  { id: 3, term: '2027-S1' },
  { id: 4, term: '2025-S2' },
  { id: 5, term: '' },
];

test('the term list has each term once, in order', () => {
  assert.deepEqual(termChoices(classes), ['2025-S2', '2026 s2', '2027-S1']);
  assert.deepEqual(termChoices([]), []);
});

test('the chosen term is in the list even when no other class uses it', () => {
  assert.deepEqual(termChoices(classes, { current: '2028-S1' }), [
    '2025-S2',
    '2026 s2',
    '2027-S1',
    '2028-S1',
  ]);
  // A term that is already there, however it is spelled, is not added again.
  assert.equal(termChoices(classes, { current: '2026-S2' }).length, 3);
  assert.equal(termChoices(classes, { current: '   ' }).length, 3);
});

test('the class being edited does not count for its own term', () => {
  const choices = termChoices(classes, { excludeId: 4 });
  assert.deepEqual(choices, ['2026 s2', '2027-S1']);
  assert.deepEqual(termChoices(classes, { excludeId: 4, current: '2025-S2' }), [
    '2025-S2',
    '2026 s2',
    '2027-S1',
  ]);
});

test('a typed term matches the list however it is spelled', () => {
  const choices = ['2026-S2', '2027-S1'];
  assert.equal(matchingTerm(choices, '2026 s2'), '2026-S2');
  assert.equal(matchingTerm(choices, ' 2027S1 '), '2027-S1');
  assert.equal(matchingTerm(choices, '2028-S1'), '');
  assert.equal(matchingTerm(choices, ''), '');
});

test('the "add a new term" choice cannot be mistaken for a term', () => {
  assert.equal(NEW_TERM, '__new__');
  assert.equal(
    termChoices([{ id: 1, term: '2026-S2' }]).includes(NEW_TERM),
    false,
  );
});
