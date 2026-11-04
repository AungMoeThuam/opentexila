import { computed, ref, toValue } from 'vue';
import { ApiError } from '../../../shared/services/api-client.js';

const isPageInRange = (value, totalPages) =>
  Number.isInteger(value) && value >= 1 && value <= totalPages;

const isNotFound = (cause) =>
  (cause instanceof ApiError &&
    (cause.status === 404 || cause.code === 'RESOURCE_NOT_FOUND')) ||
  cause instanceof RangeError;

export function useClassRoster({ service, classId, limit = 20 }) {
  const enrolments = ref([]);
  const context = ref(null);
  const meta = ref(null);
  const page = ref(1);
  const loading = ref(false);
  const error = ref(null);
  const notFound = computed(() => isNotFound(error.value));

  let controller = null;
  let requestId = 0;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const id = ++requestId;

    loading.value = true;
    error.value = null;
    try {
      const result = await service.listClassRoster(
        toValue(classId),
        { page: page.value, limit },
        { signal },
      );
      if (id !== requestId) return;
      enrolments.value = result.data;
      context.value = result.context ?? null;
      meta.value = result.meta;
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      enrolments.value = [];
      meta.value = null;
      if (isNotFound(cause)) context.value = null;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function setPage(n) {
    if (!meta.value || !isPageInRange(n, meta.value.totalPages)) return;
    page.value = n;
    return load();
  }

  function retry() {
    return load();
  }

  function reset() {
    controller?.abort();
    controller = null;
    requestId += 1;
    enrolments.value = [];
    context.value = null;
    meta.value = null;
    page.value = 1;
    loading.value = false;
    error.value = null;
  }

  return {
    enrolments,
    context,
    meta,
    page,
    loading,
    error,
    notFound,
    load,
    setPage,
    retry,
    reset,
  };
}
