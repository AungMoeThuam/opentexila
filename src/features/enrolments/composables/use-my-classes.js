import { ref } from 'vue';
export function useMyClasses({ service, limit = 20 }) {
  const classes = ref([]),
    courses = ref([]),
    meta = ref(null),
    loading = ref(false),
    error = ref(null);
  let controller,
    version = 0,
    page = 1,
    filters = {},
    coursesLoaded = false;
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal,
      current = ++version;
    loading.value = true;
    error.value = null;
    try {
      const result = await service.list(
        { ...filters, page, limit },
        { signal },
      );
      // Fetch choices independently, so filters remain complete across pages.
      if (!coursesLoaded) {
        const choices = new Map();
        for (let n = 1; ; n++) {
          const batch = await service.list({ page: n, limit: 100 }, { signal });
          if (current !== version) return;
          batch.data.forEach((c) => choices.set(c.course.id, c.course));
          if (n >= batch.meta.totalPages) break;
        }
        courses.value = [...choices.values()].sort((a, b) =>
          a.code.localeCompare(b.code),
        );
        coursesLoaded = true;
      }
      if (current !== version) return;
      classes.value = result.data;
      meta.value = result.meta;
    } catch (cause) {
      if (current !== version || cause.name === 'AbortError') return;
      error.value = cause;
      classes.value = [];
      meta.value = null;
    } finally {
      if (current === version) loading.value = false;
    }
  }
  function applyFilters(value) {
    filters = { ...value };
    page = 1;
    return load();
  }
  function setPage(value) {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > (meta.value?.totalPages ?? 0) ||
      loading.value
    )
      return;
    page = value;
    return load();
  }
  function dispose() {
    version++;
    controller?.abort();
  }
  return {
    classes,
    courses,
    meta,
    loading,
    error,
    load,
    applyFilters,
    setPage,
    dispose,
  };
}
