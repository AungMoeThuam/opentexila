import { computed, ref } from 'vue';
import { usePagedList } from '../../courses/composables/use-paged-list.js';

// Feed state across the user's classes: class, search, category and sort
// filters plus paging. `onChange(state)` runs whenever the user changes a
// filter or the page, so the page can keep the address in step with the view.
export function useAnnouncementFeed({
  service,
  limit = 20,
  onChange = () => {},
}) {
  const search = ref('');
  const applied = ref('');
  const searchError = ref('');
  const category = ref('');
  const sort = ref('newest');
  const classId = ref('');

  const list = usePagedList(
    (params, options) => service.list(params, options),
    {
      limit,
      filters: () => ({
        ...(classId.value ? { classId: classId.value } : {}),
        ...(applied.value ? { search: applied.value } : {}),
        ...(category.value ? { category: category.value } : {}),
        sort: sort.value,
      }),
    },
  );

  const filtered = computed(() =>
    Boolean(applied.value || category.value || classId.value),
  );

  const state = () => ({
    classId: classId.value,
    search: applied.value,
    category: category.value,
    sort: sort.value,
    page: list.page.value,
  });

  // Sets every filter from a parsed address (see feed-query.js). Call load() after.
  function restore(next) {
    classId.value = next.classId;
    search.value = applied.value = next.search;
    category.value = next.category;
    sort.value = next.sort;
    searchError.value = '';
    list.page.value = next.page;
  }

  function reloadAndNotify() {
    const result = list.reload();
    onChange(state());
    return result;
  }

  function applySearch() {
    const value = search.value.trim();
    if (value.length > 100) {
      searchError.value = 'Search must be 100 characters or fewer.';
      return;
    }
    searchError.value = '';
    applied.value = value;
    return reloadAndNotify();
  }

  // Class, category and sort apply at once; they have no typing step.
  function applyChoice() {
    return reloadAndNotify();
  }

  function clearFilters() {
    search.value = '';
    searchError.value = '';
    applied.value = '';
    category.value = '';
    sort.value = 'newest';
    classId.value = '';
    return reloadAndNotify();
  }

  function setPage(next) {
    const result = list.setPage(next);
    onChange(state());
    return result;
  }

  return {
    ...list,
    setPage,
    search,
    searchError,
    category,
    sort,
    classId,
    filtered,
    state,
    restore,
    applySearch,
    applyChoice,
    clearFilters,
  };
}
