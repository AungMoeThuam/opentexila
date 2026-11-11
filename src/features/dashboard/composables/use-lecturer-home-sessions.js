import { ref } from 'vue';
import {
  groupHomeSessions,
  homeSessionsWindow,
} from '../services/home-sessions-window.js';

const LIMIT = 10;

export function useLecturerHomeSessions({ service, now = () => new Date() }) {
  const state = ref('loading'); // 'loading' | 'empty' | 'error' | 'success'
  const groups = ref({ today: [], upcoming: [] });
  const error = ref(null);

  let controller = null;
  let requestId = 0;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    const id = ++requestId;
    const current = now();

    state.value = 'loading';
    error.value = null;
    try {
      const result = await service.listMyClassSessions(
        { ...homeSessionsWindow(current), limit: LIMIT },
        { signal: controller.signal },
      );
      if (id !== requestId) return;
      groups.value = groupHomeSessions(result.data, current);
      const { today, upcoming } = groups.value;
      state.value = today.length + upcoming.length ? 'success' : 'empty';
    } catch (cause) {
      if (id !== requestId || cause?.name === 'AbortError') return;
      error.value = cause;
      groups.value = { today: [], upcoming: [] };
      state.value = 'error';
    }
  }

  return { state, groups, error, load, retry: load };
}
