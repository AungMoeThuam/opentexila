// Pure mapping from analytics API data to Chart.js config plus a table view.
// No Vue or Chart.js imports: the same numbers feed the chart and its table.
const STATUSES = [
  { key: 'present', label: 'Present', pointStyle: 'circle', dash: [] },
  { key: 'late', label: 'Late', pointStyle: 'triangle', dash: [6, 4] },
  { key: 'absent', label: 'Absent', pointStyle: 'rect', dash: [2, 3] },
];

// Fallbacks match --ot-success, --ot-warning and --ot-danger in tokens.css.
export const DEFAULT_PALETTE = {
  present: '#176541',
  late: '#805400',
  absent: '#a32936',
};

const sum = (values) => values.reduce((total, value) => total + value, 0);

export const formatRate = (rate) => `${Number(rate).toFixed(1)}%`;

export function classLabel(cls) {
  const course = [cls.course?.code, cls.course?.name].filter(Boolean).join(' ');
  const detail = [cls.section ? `Sec ${cls.section}` : '', cls.term]
    .filter(Boolean)
    .join(', ');
  return detail ? `${course} (${detail})` : course;
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const countColumns = (firstKey, firstLabel) => [
  { key: firstKey, label: firstLabel },
  ...STATUSES.map(({ key, label }) => ({ key, label })),
];

export function buildTrendChart(trend, { palette = DEFAULT_PALETTE } = {}) {
  const rows = trend ?? [];
  return {
    type: 'line',
    empty: rows.length === 0,
    ariaLabel: 'Line chart of present, late and absent counts by date',
    summary: `Attendance trend across ${rows.length} dates, with present, late and absent counts for each.`,
    data: {
      labels: rows.map((row) => row.date),
      datasets: STATUSES.map(({ key, label, pointStyle, dash }) => ({
        label,
        data: rows.map((row) => row[key]),
        borderColor: palette[key],
        backgroundColor: palette[key],
        borderDash: dash,
        pointStyle,
        pointRadius: 4,
        tension: 0.25,
      })),
    },
    options: {
      ...baseOptions,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { labels: { usePointStyle: true } } },
    },
    tableColumns: countColumns('date', 'Date'),
    tableRows: rows.map(({ date, present, late, absent }) => ({
      date,
      present,
      late,
      absent,
    })),
  };
}

export function buildStatusBreakdownChart(
  summary,
  { palette = DEFAULT_PALETTE } = {},
) {
  const counts = STATUSES.map(({ key }) => summary?.[key] ?? 0);
  const total = sum(counts);
  const share = (count) => formatRate(total === 0 ? 0 : (count / total) * 100);
  return {
    type: 'doughnut',
    empty: total === 0,
    ariaLabel:
      'Doughnut chart of the share of present, late and absent records',
    summary: `${total} attendance records: ${STATUSES.map(
      ({ label }, i) => `${counts[i]} ${label.toLowerCase()}`,
    ).join(', ')}.`,
    data: {
      labels: STATUSES.map(({ label }) => label),
      datasets: [
        {
          data: counts,
          backgroundColor: STATUSES.map(({ key }) => palette[key]),
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...baseOptions,
      plugins: { legend: { position: 'bottom' } },
    },
    tableColumns: [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Records' },
      { key: 'share', label: 'Share' },
    ],
    tableRows: STATUSES.map(({ label }, i) => ({
      status: label,
      count: counts[i],
      share: share(counts[i]),
    })),
  };
}

export function buildClassComparisonChart(
  byClass,
  { palette = DEFAULT_PALETTE } = {},
) {
  const rows = byClass ?? [];
  return {
    type: 'bar',
    empty: rows.length === 0,
    ariaLabel: 'Bar chart comparing present, late and absent counts by class',
    summary: `Attendance for ${rows.length} classes, with present, late and absent counts and the attendance rate of each.`,
    data: {
      labels: rows.map(classLabel),
      datasets: STATUSES.map(({ key, label, dash }) => ({
        label,
        data: rows.map((row) => row[key]),
        backgroundColor: palette[key],
        borderColor: palette[key],
        borderDash: dash,
        borderWidth: dash.length ? 2 : 0,
      })),
    },
    options: {
      ...baseOptions,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
    tableColumns: [
      { key: 'class', label: 'Class' },
      ...STATUSES.map(({ key, label }) => ({ key, label })),
      { key: 'rate', label: 'Attendance rate' },
    ],
    tableRows: rows.map((row) => ({
      class: classLabel(row),
      present: row.present,
      late: row.late,
      absent: row.absent,
      rate: formatRate(row.attendanceRate),
    })),
  };
}
