import { ref } from 'vue';
import { roomWindow, roomsById } from '../services/waiting-sessions.js';

// The rooms of the sessions waiting for an attendance record. One request to
// the lecturer's session list for the time window of those sessions. The rooms
// only make the card clearer, so a failure leaves them out and shows nothing.
// `service.listMyClassSessions(params, { signal })` resolves to { data }.
export function useSessionRooms({ service }) {
  const rooms = ref({});
  let controller = null;
  let requestId = 0;

  async function load(sessions) {
    controller?.abort();
    const window = roomWindow(sessions ?? []);
    if (!window) {
      rooms.value = {};
      return;
    }
    controller = new AbortController();
    const id = ++requestId;
    try {
      const result = await service.listMyClassSessions(
        { ...window, limit: 100 },
        { signal: controller.signal },
      );
      if (id === requestId) rooms.value = roomsById(result.data);
    } catch (cause) {
      if (id === requestId && cause?.name !== 'AbortError') rooms.value = {};
    }
  }

  function stop() {
    requestId += 1;
    controller?.abort();
  }

  return { rooms, load, stop };
}
