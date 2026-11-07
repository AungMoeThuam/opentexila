import { computed, reactive, ref } from 'vue';

const isPageInRange = (value, totalPages) =>
  Number.isInteger(value) && value >= 1 && value <= totalPages;

export function useStudentClasses({
  service,
  limit = 20,
  initialFilters = {},
} = {}) {
  const classes = ref([]);
  const meta = ref(null);
  const page = ref(1);
  const loading = ref(false);
  const error = ref(null);

  const filters = reactive({
    courseId: initialFilters.courseId || '',
    term: initialFilters.term || '',
  });

  const hasActiveFilters = computed(
    () => Boolean(filters.courseId) || Boolean(filters.term),
  );

  let controller = null;
  let requestId = 0;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const currentId = ++requestId;

    loading.value = true;
    error.value = null;

    const params = {
      page: page.value,
      limit,
    };

    if (filters.courseId) {
      params.courseId = filters.courseId;
    }

    if (filters.term) {
      params.term = filters.term;
    }

    try {
      const result = await service.listEnrolledClasses(params, { signal });
      if (currentId !== requestId) return;
      classes.value = result.data || [];
      meta.value = result.meta || null;
    } catch (cause) {
      if (currentId !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      classes.value = [];
      meta.value = null;
    } finally {
      if (currentId === requestId) {
        loading.value = false;
      }
    }
  }

  function setPage(n) {
    if (!meta.value || !isPageInRange(n, meta.value.totalPages)) return;
    page.value = n;
    return load();
  }

  function setFilters(newFilters = {}) {
    if (newFilters.courseId !== undefined) {
      filters.courseId = newFilters.courseId;
    }
    if (newFilters.term !== undefined) {
      filters.term = newFilters.term;
    }
    page.value = 1;
    return load();
  }

  function resetFilters() {
    filters.courseId = '';
    filters.term = '';
    page.value = 1;
    return load();
  }

  function retry() {
    return load();
  }

  function reset() {
    controller?.abort();
    controller = null;
    requestId += 1;
    classes.value = [];
    meta.value = null;
    page.value = 1;
    filters.courseId = '';
    filters.term = '';
    loading.value = false;
    error.value = null;
  }

  return {
    classes,
    meta,
    page,
    filters,
    hasActiveFilters,
    loading,
    error,
    load,
    setPage,
    setFilters,
    resetFilters,
    retry,
    reset,
  };
}
