import { ref } from 'vue';

// Totals for the admin home cards. Each service has list(params, { signal })
// that resolves to { data, meta: { total } }. One row per request is enough,
// because only `meta.total` is read. The links on the page work without the
// totals, so a failure only shows a message with Retry.
export function useAdminHomeCounts({ coursesService, classesService }) {
  const state = ref('loading'); // 'loading' | 'empty' | 'error' | 'success'
  const counts = ref({ courses: null, classes: null });
  const error = ref(null);

  let controller = null;
  let requestId = 0;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const id = ++requestId;
    const { signal } = controller;
    state.value = 'loading';
    error.value = null;
    try {
      const params = { page: 1, limit: 1 };
      const [courses, classes] = await Promise.all([
        coursesService.list(params, { signal }),
        classesService.list(params, { signal }),
      ]);
      if (id !== requestId) return;
      counts.value = {
        courses: courses.meta.total,
        classes: classes.meta.total,
      };
      state.value =
        counts.value.courses + counts.value.classes > 0 ? 'success' : 'empty';
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      counts.value = { courses: null, classes: null };
      state.value = 'error';
    }
  }

  function stop() {
    requestId += 1;
    controller?.abort();
  }

  return { state, counts, error, load, retry: load, stop };
}
