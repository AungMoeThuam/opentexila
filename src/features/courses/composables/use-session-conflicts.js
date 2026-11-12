import { computed, onScopeDispose, ref, watch } from 'vue';
import {
  conflictRange,
  findSessionConflicts,
} from '../services/session-conflicts.js';

// Warns while the admin types: which existing sessions clash with the times
// being entered. `service.list({ from, to }, { signal })` resolves to timetable
// sessions. `target()` gives { classId, lecturerId, room }. `times()` gives
// { start, end } as Dates, or nulls while they are not usable yet.
// The warning is advice. The server decides when the session is saved.
export function useSessionConflicts({ service, target, times, delay = 300 }) {
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const loadedKey = ref('');

  let timer = null;
  let controller = null;
  let requestId = 0;
  const cache = new Map(); // "from|to" -> sessions

  const range = computed(() => {
    const { start, end } = times();
    return start && end && end.getTime() > start.getTime()
      ? conflictRange(start, end)
      : null;
  });

  // Cleared at once when the times are not usable, so no stale warning stays.
  const conflicts = computed(() => {
    const { start, end } = times();
    return findSessionConflicts(sessions.value, { ...target(), start, end });
  });

  async function load(key, { from, to }) {
    controller?.abort();
    controller = new AbortController();
    const id = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      const rows = await service.list(
        { from, to },
        { signal: controller.signal },
      );
      if (id !== requestId) return;
      cache.set(key, rows);
      sessions.value = rows;
      loadedKey.value = key;
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      // The check could not run. The form still works and the server checks.
      error.value = cause;
      sessions.value = [];
      loadedKey.value = '';
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function stop() {
    clearTimeout(timer);
    controller?.abort();
    requestId += 1;
  }

  const stopWatching = watch(
    () => (range.value ? `${range.value.from}|${range.value.to}` : ''),
    (key) => {
      clearTimeout(timer);
      if (!key) {
        sessions.value = [];
        loadedKey.value = '';
        error.value = null;
        return;
      }
      if (cache.has(key)) {
        sessions.value = cache.get(key);
        loadedKey.value = key;
        error.value = null;
        return;
      }
      const wanted = range.value;
      timer = setTimeout(() => load(key, wanted), delay);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    stopWatching();
    stop();
  });

  return { conflicts, loading, error, loadedKey, stop };
}
