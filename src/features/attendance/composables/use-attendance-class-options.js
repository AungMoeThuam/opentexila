import { ref } from 'vue';

const labelFor = (cls) => {
  const course = [cls.course?.code, cls.course?.name]
    .filter(Boolean)
    .join(' - ');
  const detail = [cls.term, cls.section ? `Sec ${cls.section}` : '']
    .filter(Boolean)
    .join(', ');
  return detail ? `${course} (${detail})` : course;
};

export function useAttendanceClassOptions({ fetchPage, limit = 50 }) {
  const options = ref([]);
  const loading = ref(false);
  const error = ref(null);

  let controller = null;
  let requestId = 0;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const id = ++requestId;

    loading.value = true;
    error.value = null;

    try {
      const byId = new Map();
      let page = 1;
      let totalPages = 1;
      do {
        const result = await fetchPage({ page, limit }, { signal });
        if (id !== requestId) return;
        for (const cls of result.data ?? []) {
          if (cls?.id == null || byId.has(cls.id)) continue;
          byId.set(cls.id, { id: cls.id, label: labelFor(cls) });
        }
        totalPages = result.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      options.value = [...byId.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      options.value = [];
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  return { options, loading, error, load, retry: load };
}
