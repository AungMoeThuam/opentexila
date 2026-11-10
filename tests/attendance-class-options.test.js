import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceClassOptionsQuery } from '../src/features/attendance/services/attendance-query.js';

test('class options query targets the lookup with paging only', () => {
  const url = new URL(
    buildAttendanceClassOptionsQuery({
      page: 2,
      limit: 50,
      classId: 9,
      status: 'present',
    }),
    'http://localhost',
  );

  assert.equal(url.pathname, '/me/attendance-records/classes');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('limit'), '50');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['limit', 'page']);
});

test('class options query without params has no query string', () => {
  assert.equal(
    buildAttendanceClassOptionsQuery(),
    '/me/attendance-records/classes',
  );
});

import { useAttendanceClassOptions } from '../src/features/attendance/composables/use-attendance-class-options.js';

const cls = (id, code, section, term = '2026-S2') => ({
  id,
  course: { code, name: `Name ${code}` },
  section,
  term,
});

const pageOf = (data, page, totalPages) => ({
  data,
  meta: { page, limit: 2, total: 99, totalPages },
});

function fakeFetch(pages) {
  const calls = [];
  const fn = async (params) => {
    calls.push(params);
    const next = pages[params.page - 1];
    if (next instanceof Error) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
}

test('loads every page of class options, deduped and sorted with term and section', async () => {
  const fetchPage = fakeFetch([
    pageOf([cls(2, 'COS20', 'A'), cls(1, 'COS10', 'B', '2025-S1')], 1, 2),
    pageOf([cls(2, 'COS20', 'A'), cls(3, 'COS10', 'A')], 2, 2),
  ]);
  const options = useAttendanceClassOptions({ fetchPage, limit: 2 });

  await options.load();

  assert.deepEqual(
    fetchPage.calls.map((c) => c.page),
    [1, 2],
  );
  assert.deepEqual(options.options.value, [
    { id: 1, label: 'COS10 - Name COS10 (2025-S1, Sec B)' },
    { id: 3, label: 'COS10 - Name COS10 (2026-S2, Sec A)' },
    { id: 2, label: 'COS20 - Name COS20 (2026-S2, Sec A)' },
  ]);
  assert.equal(options.loading.value, false);
  assert.equal(options.error.value, null);
});

test('a failed lookup exposes the error, keeps no options, and retry recovers', async () => {
  let fail = true;
  const fetchPage = async () => {
    if (fail) throw new Error('boom');
    return pageOf([cls(1, 'COS10', 'A')], 1, 1);
  };
  const options = useAttendanceClassOptions({ fetchPage });

  await options.load();
  assert.equal(options.error.value.message, 'boom');
  assert.deepEqual(options.options.value, []);
  assert.equal(options.loading.value, false);

  fail = false;
  await options.retry();
  assert.equal(options.error.value, null);
  assert.equal(options.options.value.length, 1);
});

test('a failure on a later page discards partial options', async () => {
  const fetchPage = fakeFetch([
    pageOf([cls(1, 'COS10', 'A')], 1, 2),
    new Error('page 2 failed'),
  ]);
  const options = useAttendanceClassOptions({ fetchPage });

  await options.load();

  assert.equal(options.error.value.message, 'page 2 failed');
  assert.deepEqual(options.options.value, []);
});
