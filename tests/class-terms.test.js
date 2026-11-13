import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distinctTerms } from '../src/features/enrolments/services/class-terms.js';

test('each term appears once, in order', () => {
  assert.deepEqual(
    distinctTerms([
      { id: 1, term: '2026-S2' },
      { id: 2, term: '2025-S2' },
      { id: 3, term: '2026-S2' },
      { id: 4, term: '2027-S1' },
    ]),
    ['2025-S2', '2026-S2', '2027-S1'],
  );
  assert.deepEqual(distinctTerms([]), []);
});

test('spellings of one term are one term, with the newest class spelling', () => {
  assert.deepEqual(
    distinctTerms([
      { id: 1, term: '2026 s2' },
      { id: 9, term: '2026-S2' },
      { id: 4, term: '2026S2' },
    ]),
    ['2026-S2'],
  );
  // Spaces are tidied.
  assert.deepEqual(distinctTerms([{ id: 1, term: '  2026   S2 ' }]), [
    '2026 S2',
  ]);
});

test('classes without a term are left out', () => {
  assert.deepEqual(
    distinctTerms([
      { id: 1, term: '' },
      { id: 2, term: '   ' },
      { id: 3 },
      null,
      { id: 4, term: '2026-S2' },
    ]),
    ['2026-S2'],
  );
});
