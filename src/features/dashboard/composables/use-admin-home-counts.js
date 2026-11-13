import { ref } from 'vue';

// Totals for the admin home tiles. Each service has list(params, { signal })
// that resolves to { data, meta: { total } }. One row per request is enough,
// because only `meta.total` is read. The links on the page work without the
// totals, so a failure only shows a message with Retry.
//
// `usersService` is optional. When it is given, the number of students and of
// lecturers is loaded too (the user list can be filtered by role).
export function useAdminHomeCounts({
  coursesService,
  classesService,
  usersService = null,
}) {
  const state = ref('loading'); // 'loading' | 'empty' | 'error' | 'success'
  const counts = ref(emptyCounts());
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
      const [courses, classes, students, lecturers] = await Promise.all([
        coursesService.list(params, { signal }),
        classesService.list(params, { signal }),
        usersService
          ? usersService.list({ ...params, role: 'student' }, { signal })
          : null,
        usersService
          ? usersService.list({ ...params, role: 'lecturer' }, { signal })
          : null,
      ]);
      if (id !== requestId) return;
      counts.value = {
        courses: courses.meta.total,
        classes: classes.meta.total,
        students: students ? students.meta.total : null,
        lecturers: lecturers ? lecturers.meta.total : null,
      };
      // "Nothing is set up" is about courses and classes only; the demo admin
      // account itself must not make the page look set up.
      state.value =
        counts.value.courses + counts.value.classes > 0 ? 'success' : 'empty';
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      counts.value = emptyCounts();
      state.value = 'error';
    }
  }

  function stop() {
    requestId += 1;
    controller?.abort();
  }

  return { state, counts, error, load, retry: load, stop };
}

function emptyCounts() {
  return { courses: null, classes: null, students: null, lecturers: null };
}
