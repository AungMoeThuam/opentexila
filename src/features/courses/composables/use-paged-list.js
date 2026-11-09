import { ref } from 'vue';

// Loads one page at a time; a newer request cancels and supersedes older ones.
// `fetchPage(params, { signal })` must resolve to `{ data, meta }`.
export function usePagedList(
  fetchPage,
  { limit = 20, filters = () => ({}) } = {},
) {
  const rows = ref([]);
  const meta = ref(null);
  const page = ref(1);
  const loading = ref(false);
  const error = ref(null);
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
      const result = await fetchPage(
        { page: page.value, limit, ...filters() },
        { signal },
      );
      if (id !== requestId) return;
      rows.value = result.data;
      meta.value = result.meta;
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      rows.value = [];
      meta.value = null;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function setPage(next) {
    if (loading.value || !meta.value) return;
    if (!Number.isInteger(next) || next < 1 || next > meta.value.totalPages)
      return;
    page.value = next;
    return load();
  }

  // Starts again from page 1, e.g. after the filters change.
  function reload() {
    page.value = 1;
    return load();
  }

  function cancel() {
    controller?.abort();
    controller = null;
    requestId += 1;
    loading.value = false;
  }

  return { rows, meta, page, loading, error, load, reload, setPage, cancel };
}
