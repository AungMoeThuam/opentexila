import { ref } from 'vue';
import { sessionsForToday, todayRange } from '../services/admin-home-today.js';

// Today's class sessions for the admin home page. It has its own state, so a
// failure here never hides the totals. `timetableService.list({ from, to },
// { signal })` resolves to an array of sessions.
export function useAdminTodaySessions({
  timetableService,
  now = () => new Date(),
}) {
  const state = ref('loading'); // 'loading' | 'empty' | 'error' | 'success'
  const sessions = ref([]);
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
      const moment = now();
      const all = await timetableService.list(todayRange(moment), { signal });
      if (id !== requestId) return;
      sessions.value = sessionsForToday(all, moment);
      state.value = sessions.value.length > 0 ? 'success' : 'empty';
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      sessions.value = [];
      state.value = 'error';
    }
  }

  function stop() {
    requestId += 1;
    controller?.abort();
  }

  return { state, sessions, error, load, retry: load, stop };
}
