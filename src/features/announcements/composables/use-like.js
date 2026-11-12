import { reactive } from 'vue';
import { optimisticLike, settleLike } from '../services/like-state.js';

// Like state for one announcement. `service` has like(id) and unlike(id).
// A click shows the new state at once. While a request runs, more clicks are
// ignored. A failed request puts the old state back and sets `error`.
export function useLike({ service }) {
  const state = reactive({
    liked: false,
    like_count: 0,
    busy: false,
    error: '',
  });

  function set(announcement) {
    state.liked = Boolean(announcement.liked_by_me);
    state.like_count = announcement.like_count ?? 0;
    state.error = '';
  }

  async function toggle(announcementId) {
    if (state.busy) return;
    const before = { liked: state.liked, like_count: state.like_count };
    Object.assign(state, optimisticLike(before), { busy: true, error: '' });
    try {
      const response = before.liked
        ? await service.unlike(announcementId)
        : await service.like(announcementId);
      Object.assign(state, settleLike(before, response));
    } catch (cause) {
      Object.assign(state, before, {
        error:
          cause?.message ||
          (before.liked
            ? 'Your like could not be removed.'
            : 'Your like could not be saved.'),
      });
      throw cause;
    } finally {
      state.busy = false;
    }
  }

  return { state, set, toggle };
}
