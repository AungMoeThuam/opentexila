// Filter parsing and request building for the lecturer attendance analytics.
// Calendar days are Malaysia-local, matching filter-params.js.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 30;
const BASE_PATH = '/lecturer/attendance-analytics';

export const AT_RISK_DEFAULT = 75;
export const AT_RISK_MAX = 100;

const formatDay = (date) => date.toISOString().slice(0, 10);

export function defaultDateRange(now = new Date()) {
  const today = new Date(now.getTime() + MALAYSIA_OFFSET_MS);
  const start = new Date(today.getTime() - (RANGE_DAYS - 1) * DAY_MS);
  return { from: formatDay(start), to: formatDay(today) };
}

const isRealDate = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && formatDay(date) === value;
};

const isThreshold = (value) =>
  Number.isInteger(value) && value >= AT_RISK_DEFAULT && value <= AT_RISK_MAX;

export function filtersFromQuery(query = {}, now = new Date()) {
  const defaults = defaultDateRange(now);
  const notices = [];
  const filters = {
    classId: '',
    from: defaults.from,
    to: defaults.to,
    atRiskBelow: AT_RISK_DEFAULT,
  };
  const present = (key) => query[key] !== undefined && query[key] !== '';

  if (present('classId')) {
    const value = query.classId;
    if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
      filters.classId = value;
    } else {
      notices.push(
        'The class in the link is not valid, so all classes are shown.',
      );
    }
  }
  for (const [key, label] of [
    ['from', 'start date'],
    ['to', 'end date'],
  ]) {
    if (!present(key)) continue;
    if (isRealDate(query[key])) filters[key] = query[key];
    else
      notices.push(
        `The ${label} in the link is not valid, so the default was used.`,
      );
  }
  if (present('atRiskBelow')) {
    const value = Number(query.atRiskBelow);
    if (typeof query.atRiskBelow === 'string' && isThreshold(value)) {
      filters.atRiskBelow = value;
    } else {
      notices.push(
        `The at-risk threshold in the link is not valid, so ${AT_RISK_DEFAULT}% was used.`,
      );
    }
  }
  return { filters, notices };
}

export function filtersToQuery({ classId, from, to, atRiskBelow }) {
  const query = {};
  if (classId) query.classId = String(classId);
  if (from) query.from = from;
  if (to) query.to = to;
  if (atRiskBelow !== AT_RISK_DEFAULT) query.atRiskBelow = String(atRiskBelow);
  return query;
}

export function validateFilters({ from, to, atRiskBelow }) {
  const errors = {};
  if (!isRealDate(from)) errors.from = 'Enter a valid start date.';
  if (!isRealDate(to)) errors.to = 'Enter a valid end date.';
  if (!errors.from && !errors.to && from > to) {
    errors.from = 'Start date must be on or before end date.';
  }
  if (!isThreshold(atRiskBelow)) {
    errors.atRiskBelow = `Enter a whole number from ${AT_RISK_DEFAULT} to ${AT_RISK_MAX}.`;
  }
  return Object.keys(errors).length ? errors : null;
}

export function buildAnalyticsPath({ classId, from, to, atRiskBelow }) {
  const params = new URLSearchParams();
  if (classId) params.set('classId', String(classId));
  params.set('from', from);
  params.set('to', to);
  params.set('atRiskBelow', String(atRiskBelow));
  return `${BASE_PATH}?${params}`;
}
