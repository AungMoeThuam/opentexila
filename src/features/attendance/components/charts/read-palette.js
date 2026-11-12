import { DEFAULT_PALETTE } from '../../composables/use-chart-data.js';

// Chart.js draws on a canvas, so CSS variables are resolved here once.
export function readPalette(element = document.documentElement) {
  const styles = getComputedStyle(element);
  const read = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    present: read('--ot-success', DEFAULT_PALETTE.present),
    late: read('--ot-warning', DEFAULT_PALETTE.late),
    absent: read('--ot-danger', DEFAULT_PALETTE.absent),
  };
}
