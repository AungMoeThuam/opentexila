import { computed, reactive, ref } from 'vue';
import { ApiError } from '../../../shared/services/api-client.js';
import {
  filtersFromQuery,
  validateFilters,
} from '../services/analytics-query.js';

const DEBOUNCE_MS = 300;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isAnalyticsPayload = (payload) =>
  isObject(payload) &&
  isObject(payload.data) &&
  isObject(payload.data.summary) &&
  Array.isArray(payload.data.trend) &&
  Array.isArray(payload.data.byClass) &&
  Array.isArray(payload.data.atRisk);

const FINALISE_PROBLEMS = {
  not_due: 'This class session has not ended yet, so it cannot be finalised.',
  cancelled: 'This class session was cancelled, so it cannot be finalised.',
};

const FILTER_KEYS = ['from', 'to', 'atRiskBelow'];

// A 422 names the invalid filters; show each message under its own field.
function serverFieldErrors(cause) {
  const fields = Object.fromEntries(
    FILTER_KEYS.filter((key) => cause.fields?.[key]).map((key) => [
      key,
      cause.fields[key],
    ]),
  );
  return Object.keys(fields).length ? fields : null;
}

// The URL owns the filters: initialQuery seeds them and onFiltersChange
// reports each valid change so the page can write it back to the URL.
export function useAttendanceAnalytics({
  service,
  initialQuery = {},
  now = () => new Date(),
  debounceMs = DEBOUNCE_MS,
  onFiltersChange = () => {},
}) {
  const initial = filtersFromQuery(initialQuery, now());
  const filters = reactive({ ...initial.filters });
  const notices = ref(initial.notices);
  const filterErrors = ref(validateFilters(filters));
  // The filters behind the data on screen, which can lag the form while typing.
  const applied = reactive({ ...initial.filters });
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const finalisingId = ref(null);
  const finaliseError = ref(null);

  const isEmpty = computed(() => {
    const result = data.value;
    return Boolean(
      result &&
      result.summary.sessions === 0 &&
      result.trend.length === 0 &&
      result.byClass.length === 0 &&
      result.unfinalised.length === 0 &&
      result.atRisk.length === 0,
    );
  });

  let controller = null;
  let requestId = 0;
  let timer = null;

  const cancelPending = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  async function load() {
    cancelPending();
    const errors = validateFilters(filters);
    filterErrors.value = errors;
    if (errors) return;

    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const id = ++requestId;

    loading.value = true;
    error.value = null;
    const requested = { ...filters };
    try {
      const payload = await service.getAttendanceAnalytics(requested, {
        signal,
      });
      if (id !== requestId) return;
      if (!isAnalyticsPayload(payload)) {
        throw new ApiError('The server returned an unexpected response.', {
          code: 'INVALID_RESPONSE',
        });
      }
      data.value = {
        ...payload.data,
        unfinalised: payload.data.unfinalised ?? [],
      };
      Object.assign(applied, requested);
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      const fields = cause?.status === 422 ? serverFieldErrors(cause) : null;
      if (fields) filterErrors.value = fields;
      else error.value = cause;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function updateFilters(patch) {
    Object.assign(filters, patch);
    const errors = validateFilters(filters);
    filterErrors.value = errors;
    cancelPending();
    if (errors) return;
    notices.value = [];
    onFiltersChange({ ...filters });
    timer = setTimeout(load, debounceMs);
  }

  // Stop the pending timer and any in-flight request when the page closes.
  function dispose() {
    cancelPending();
    controller?.abort();
    requestId += 1;
  }

  // Only the Lecturer's own sessions can be finalised; the server checks it.
  async function finalise(classSessionId) {
    finalisingId.value = classSessionId;
    finaliseError.value = null;
    try {
      const result = await service.finaliseClassSession(classSessionId);
      const problem = FINALISE_PROBLEMS[result?.outcome];
      if (problem) finaliseError.value = problem;
      else await load();
    } catch (cause) {
      finaliseError.value =
        cause?.message ?? 'Could not finalise this session.';
    } finally {
      finalisingId.value = null;
    }
  }

  function dismissNotices() {
    notices.value = [];
  }

  return {
    filters,
    applied,
    notices,
    filterErrors,
    data,
    loading,
    error,
    isEmpty,
    load,
    retry: load,
    updateFilters,
    finalisingId,
    finaliseError,
    finalise,
    dismissNotices,
    dispose,
  };
}
