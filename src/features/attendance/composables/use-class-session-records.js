import { computed, ref, toValue } from 'vue';
import { ApiError } from '../../../shared/services/api-client.js';

const STATUSES = ['', 'pending', 'present', 'late', 'absent'];

const isPageInRange = (value, totalPages) =>
  Number.isInteger(value) && value >= 1 && value <= totalPages;

const isNotFound = (cause) =>
  (cause instanceof ApiError &&
    (cause.status === 404 || cause.code === 'RESOURCE_NOT_FOUND')) ||
  cause instanceof RangeError;

export function useClassSessionRecords({
  service,
  classSessionId,
  limit = 20,
}) {
  const records = ref([]);
  const context = ref(null);
  const meta = ref(null);
  const status = ref('');
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
      const result = await service.listClassSessionRecords(
        toValue(classSessionId),
        { page: page.value, limit, status: status.value },
        { signal },
      );
      if (id !== requestId) return;
      records.value = result.data;
      context.value = result.context ?? null;
      meta.value = result.meta;
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      records.value = [];
      meta.value = null;
      if (isNotFound(cause)) context.value = null;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function setStatus(value) {
    if (!STATUSES.includes(value)) return;
    status.value = value;
    page.value = 1;
    return load();
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
    records.value = [];
    context.value = null;
    meta.value = null;
    status.value = '';
    page.value = 1;
    loading.value = false;
    error.value = null;
  }

  return {
    records,
    context,
    meta,
    status,
    page,
    loading,
    error,
    notFound,
    load,
    setStatus,
    setPage,
    retry,
    reset,
  };
}
