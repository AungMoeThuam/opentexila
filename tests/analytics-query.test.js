import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AT_RISK_DEFAULT,
  buildAnalyticsPath,
  defaultDateRange,
  filtersFromQuery,
  filtersToQuery,
  validateFilters,
} from '../src/features/attendance/services/analytics-query.js';

// 2026-11-12 02:00 in Malaysia (UTC+8) is still 2026-11-11 18:00 UTC.
const NOW = new Date('2026-11-11T18:00:00Z');

test('default range is the last 30 Malaysia-local days', () => {
  assert.deepEqual(defaultDateRange(NOW), {
    from: '2026-10-14',
    to: '2026-11-12',
  });
});

test('empty query gives defaults and no notices', () => {
  const { filters, notices } = filtersFromQuery({}, NOW);
  assert.deepEqual(filters, {
    classId: '',
    from: '2026-10-14',
    to: '2026-11-12',
    atRiskBelow: AT_RISK_DEFAULT,
  });
  assert.deepEqual(notices, []);
});

test('valid query values are kept', () => {
  const { filters, notices } = filtersFromQuery(
    { classId: '7', from: '2026-10-01', to: '2026-10-31', atRiskBelow: '80' },
    NOW,
  );
  assert.deepEqual(filters, {
    classId: '7',
    from: '2026-10-01',
    to: '2026-10-31',
    atRiskBelow: 80,
  });
  assert.deepEqual(notices, []);
});

test('tampered query values fall back to defaults with a notice each', () => {
  const { filters, notices } = filtersFromQuery(
    { classId: 'abc', from: 'banana', to: '2026-02-30', atRiskBelow: '50' },
    NOW,
  );
  assert.equal(filters.classId, '');
  assert.equal(filters.from, '2026-10-14');
  assert.equal(filters.to, '2026-11-12');
  assert.equal(filters.atRiskBelow, 75);
  assert.equal(notices.length, 4);
});

test('array query values are treated as invalid', () => {
  const { filters, notices } = filtersFromQuery({ classId: ['1', '2'] }, NOW);
  assert.equal(filters.classId, '');
  assert.equal(notices.length, 1);
});

test('query output keeps dates, omits default threshold and empty class', () => {
  assert.deepEqual(
    filtersToQuery({
      classId: '',
      from: '2026-10-01',
      to: '2026-10-31',
      atRiskBelow: 75,
    }),
    { from: '2026-10-01', to: '2026-10-31' },
  );
  assert.deepEqual(
    filtersToQuery({
      classId: '7',
      from: '2026-10-01',
      to: '2026-10-31',
      atRiskBelow: 90,
    }),
    { classId: '7', from: '2026-10-01', to: '2026-10-31', atRiskBelow: '90' },
  );
});

test('validation accepts a good filter set', () => {
  assert.equal(
    validateFilters({
      classId: '',
      from: '2026-10-01',
      to: '2026-10-31',
      atRiskBelow: 75,
    }),
    null,
  );
});

test('validation rejects a start date after the end date', () => {
  const errors = validateFilters({
    classId: '',
    from: '2026-11-01',
    to: '2026-10-31',
    atRiskBelow: 75,
  });
  assert.match(errors.from, /on or before/);
});

test('validation rejects blank or impossible dates', () => {
  const errors = validateFilters({
    classId: '',
    from: '',
    to: '2026-02-30',
    atRiskBelow: 75,
  });
  assert.ok(errors.from);
  assert.ok(errors.to);
});

test('threshold must be a whole number from 75 to 100', () => {
  const base = { classId: '', from: '2026-10-01', to: '2026-10-31' };
  for (const bad of [74, 101, 80.5, '', Number.NaN, 0]) {
    assert.ok(
      validateFilters({ ...base, atRiskBelow: bad })?.atRiskBelow,
      `expected ${bad} to be rejected`,
    );
  }
  for (const good of [75, 76, 100]) {
    assert.equal(validateFilters({ ...base, atRiskBelow: good }), null);
  }
});

test('API path carries all filters and always sends the threshold', () => {
  assert.equal(
    buildAnalyticsPath({
      classId: '7',
      from: '2026-10-01',
      to: '2026-10-31',
      atRiskBelow: 75,
    }),
    '/lecturer/attendance-analytics?classId=7&from=2026-10-01&to=2026-10-31&atRiskBelow=75',
  );
  assert.equal(
    buildAnalyticsPath({
      classId: '',
      from: '2026-10-01',
      to: '2026-10-31',
      atRiskBelow: 90,
    }),
    '/lecturer/attendance-analytics?from=2026-10-01&to=2026-10-31&atRiskBelow=90',
  );
});
