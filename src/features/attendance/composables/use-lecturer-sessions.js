import { computed, reactive, ref } from 'vue';
import { toQueryParams } from '../services/filter-params.js';
import {
  fetchAllSessions,
  isStatus,
  matchesStatus,
  pageOf,
} from '../services/session-status-filter.js';

const isPageInRange = (value, totalPages) =>
  Number.isInteger(value) && value >= 1 && value <= totalPages;

export function useLecturerSessions({ service, limit = 20 }) {
  const sessions = ref([]);
  const meta = ref(null);
  const filters = reactive({ classId: '', from: '', to: '', status: '' });
  const page = ref(1);
  const loading = ref(false);
  const error = ref(null);
  const filterError = ref('');

  const knownClasses = reactive(new Map());
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
      let result;
      if (isStatus(filters.status)) {
        // The API cannot filter by status, so take every session that matches
        // the other filters, keep the ones with this status and page them here.
        const { page: _page, limit: _limit, ...rest } = params;
        const all = await fetchAllSessions(service, rest, { signal });
        if (id !== requestId) return;
        rememberClasses(all);
        result = pageOf(
          all.filter((session) => matchesStatus(session, filters.status)),
          page.value,
          limit,
        );
        page.value = result.meta.page;
      } else {
        result = await service.listMyClassSessions(params, { signal });
        if (id !== requestId) return;
        rememberClasses(result.data);
      }
      sessions.value = result.data;
      meta.value = result.meta;
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
    filters.status = '';
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
