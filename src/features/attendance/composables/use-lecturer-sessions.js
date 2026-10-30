import { computed, reactive, ref } from 'vue';
import { toQueryParams } from '../services/filter-params.js';

const isPageInRange = (value, totalPages) =>
  Number.isInteger(value) && value >= 1 && value <= totalPages;

export function useLecturerSessions({ service, limit = 20 }) {
  const sessions = ref([]);
  const meta = ref(null);
  const filters = reactive({ classId: '', from: '', to: '' });
  const page = ref(1);
  const loading = ref(false);
  const error = ref(null);
  const filterError = ref('');

  const knownClasses = new Map();
  const classOptions = computed(() =>
    [...knownClasses.values()].sort((a, b) => a.label.localeCompare(b.label)),
  );

  let controller = null;
  let requestId = 0;

  function rememberClasses(items) {
    for (const session of items) {
      const cls = session?.class;
      if (!cls) continue;
      const code = cls.course?.code ?? '';
      const name = cls.course?.name ?? '';
      const value = String(cls.id);
      knownClasses.set(value, {
        value,
        label: `${code} ${name} (Section ${cls.section})`,
      });
    }
  }

  async function load() {
    let params;
    try {
      params = toQueryParams({ ...filters, page: page.value, limit });
    } catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      filterError.value = cause.message;
      return;
    }
    filterError.value = '';

    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const id = ++requestId;

    loading.value = true;
    error.value = null;
    try {
      const result = await service.listMyClassSessions(params, { signal });
      if (id !== requestId) return;
      sessions.value = result.data;
      meta.value = result.meta;
      rememberClasses(result.data);
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      sessions.value = [];
      meta.value = null;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function applyFilters() {
    page.value = 1;
    return load();
  }

  function clearFilters() {
    filters.classId = '';
    filters.from = '';
    filters.to = '';
    page.value = 1;
    filterError.value = '';
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

  return {
    sessions,
    meta,
    filters,
    page,
    loading,
    error,
    filterError,
    classOptions,
    load,
    applyFilters,
    clearFilters,
    setPage,
    retry,
  };
}
