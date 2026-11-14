import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClassComparisonChart,
  buildStatusBreakdownChart,
  buildTrendChart,
  classLabel,
  formatRate,
} from '../src/features/attendance/composables/use-chart-data.js';

const TREND = [
  { date: '2026-10-06', present: 28, late: 3, absent: 4 },
  { date: '2026-10-13', present: 30, late: 2, absent: 3 },
];

const SUMMARY = {
  sessions: 12,
  present: 180,
  late: 20,
  absent: 40,
  attendanceRate: 83.3,
  atRiskCount: 4,
};

const BY_CLASS = [
  {
    classId: 7,
    course: { code: 'COS30043', name: 'Interface Design' },
    section: '01',
    term: '2026-S2',
    present: 95,
    late: 10,
    absent: 15,
    attendanceRate: 87.5,
  },
];

const series = (chart) =>
  Object.fromEntries(chart.data.datasets.map((d) => [d.label, d.data]));

test('formatRate shows one decimal and a percent sign', () => {
  assert.equal(formatRate(83.3), '83.3%');
  assert.equal(formatRate(100), '100.0%');
  assert.equal(formatRate(0), '0.0%');
});

test('class label combines code, name, section and term', () => {
  assert.equal(
    classLabel(BY_CLASS[0]),
    'COS30043 Interface Design (Sec 01, 2026-S2)',
  );
});

test('trend chart is a line with one series per status', () => {
  const chart = buildTrendChart(TREND);
  assert.equal(chart.type, 'line');
  assert.deepEqual(chart.data.labels, ['2026-10-06', '2026-10-13']);
  assert.deepEqual(series(chart), {
    Present: [28, 30],
    Late: [3, 2],
    Absent: [4, 3],
  });
  assert.equal(chart.empty, false);
});

test('late is distinguishable without colour (dash and point shape)', () => {
  const chart = buildTrendChart(TREND);
  const [present, late, absent] = chart.data.datasets;
  assert.notDeepEqual(late.borderDash ?? [], present.borderDash ?? []);
  assert.notEqual(late.pointStyle, present.pointStyle);
  assert.notEqual(late.pointStyle, absent.pointStyle);
});

test('trend table view repeats the chart numbers', () => {
  const chart = buildTrendChart(TREND);
  assert.deepEqual(
    chart.tableColumns.map((c) => c.label),
    ['Date', 'Present', 'Late', 'Absent'],
  );
  assert.deepEqual(chart.tableRows[0], {
    date: '2026-10-06',
    present: 28,
    late: 3,
    absent: 4,
  });
  assert.equal(chart.tableRows.length, 2);
});

test('empty trend is flagged empty', () => {
  assert.equal(buildTrendChart([]).empty, true);
});

test('status breakdown is a doughnut of present, late and absent', () => {
  const chart = buildStatusBreakdownChart(SUMMARY);
  assert.equal(chart.type, 'doughnut');
  assert.deepEqual(chart.data.labels, ['Present', 'Late', 'Absent']);
  assert.deepEqual(chart.data.datasets[0].data, [180, 20, 40]);
  assert.equal(chart.empty, false);
});

test('status breakdown table gives counts and shares that sum to 100', () => {
  const chart = buildStatusBreakdownChart(SUMMARY);
  assert.deepEqual(chart.tableRows, [
    { status: 'Present', count: 180, share: '75.0%' },
    { status: 'Late', count: 20, share: '8.3%' },
    { status: 'Absent', count: 40, share: '16.7%' },
  ]);
});

test('status breakdown with no records is empty and avoids dividing by zero', () => {
  const chart = buildStatusBreakdownChart({
    ...SUMMARY,
    present: 0,
    late: 0,
    absent: 0,
  });
  assert.equal(chart.empty, true);
  assert.equal(chart.tableRows[0].share, '0.0%');
});

test('class comparison is a grouped bar with one label per class', () => {
  const chart = buildClassComparisonChart(BY_CLASS);
  assert.equal(chart.type, 'bar');
  assert.deepEqual(chart.data.labels, [
    'COS30043 Interface Design (Sec 01, 2026-S2)',
  ]);
  assert.deepEqual(series(chart), { Present: [95], Late: [10], Absent: [15] });
  assert.deepEqual(chart.tableRows[0].rate, '87.5%');
  assert.equal(chart.empty, false);
});

test('horizontal class comparison puts classes on the y axis in short lines', () => {
  const chart = buildClassComparisonChart(BY_CLASS, { horizontal: true });
  assert.equal(chart.options.indexAxis, 'y');
  assert.ok(chart.options.scales.x.beginAtZero);
  assert.equal(chart.options.scales.y, undefined);
  assert.deepEqual(chart.data.labels, [
    ['COS30043', 'Interface Design', 'Sec 01, 2026-S2'],
  ]);
  assert.ok(chart.frameHeightRem > 0);
  assert.deepEqual(series(chart), { Present: [95], Late: [10], Absent: [15] });
});

test('long course names wrap onto several short axis lines', () => {
  const [lines] = buildClassComparisonChart(
    [
      {
        ...BY_CLASS[0],
        course: { code: 'COS30043', name: 'Interface Design and Development' },
      },
    ],
    { horizontal: true },
  ).data.labels;
  assert.deepEqual(lines, [
    'COS30043',
    'Interface Design',
    'and Development',
    'Sec 01, 2026-S2',
  ]);
});

test('vertical class comparison keeps the default frame height', () => {
  const chart = buildClassComparisonChart(BY_CLASS);
  assert.equal(chart.options.indexAxis, undefined);
  assert.equal(chart.frameHeightRem, null);
});

test('a palette override is used for series colours', () => {
  const chart = buildTrendChart(TREND, {
    palette: { present: '#111111', late: '#222222', absent: '#333333' },
  });
  assert.equal(chart.data.datasets[0].borderColor, '#111111');
  assert.equal(chart.data.datasets[2].borderColor, '#333333');
});

test('each chart carries an accessible label and a summary sentence', () => {
  for (const chart of [
    buildTrendChart(TREND),
    buildStatusBreakdownChart(SUMMARY),
    buildClassComparisonChart(BY_CLASS),
  ]) {
    assert.ok(chart.ariaLabel.length > 0);
    assert.ok(chart.summary.length > 0);
  }
});
