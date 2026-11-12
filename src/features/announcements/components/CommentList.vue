<script setup>
// Comments from old to new, as plain text, with Load more. Delete shows only
// where the server said `can_delete`. The page does the requests.
import { computed } from 'vue';
import RequestState from '../../../shared/components/RequestState.vue';
import {
  formatDate,
  formatTime,
} from '../../../shared/utils/format-datetime.js';

const props = defineProps({
  comments: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hasMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
});
defineEmits(['delete', 'load-more', 'retry']);

const empty = computed(
  () => !props.loading && !props.error && props.comments.length === 0,
);
const when = (value) => `${formatDate(value)}, ${formatTime(value)}`;
</script>

<template>
  <div>
    <RequestState v-if="loading" state="loading" title="Loading comments…" />
    <RequestState
      v-else-if="error && !comments.length"
      state="error"
      title="Could not load comments"
      :message="error"
      retry
      @retry="$emit('retry')"
    />
    <p v-else-if="empty" class="ot-meta mb-0" data-test="no-comments">
      No comments yet.
    </p>
    <ul v-else class="list-unstyled mb-0 d-grid gap-3" aria-label="Comments">
      <li
        v-for="comment in comments"
        :key="comment.id"
        class="ot-comment"
        data-test="comment"
      >
        <div class="d-flex flex-wrap align-items-center gap-2">
          <p class="mb-0 fw-semibold">{{ comment.author?.name }}</p>
          <span v-if="comment.author?.role === 'lecturer'" class="ot-status"
            >Lecturer</span
          >
          <p class="ot-meta mb-0">
            <time :datetime="comment.created_at">{{
              when(comment.created_at)
            }}</time>
          </p>
          <button
            v-if="comment.can_delete"
            type="button"
            class="btn btn-sm btn-outline-danger ms-auto"
            :aria-label="`Delete comment by ${comment.author?.name}`"
            @click="$emit('delete', comment)"
          >
            Delete
          </button>
        </div>
        <p class="ot-comment-body mb-0 mt-1">{{ comment.body }}</p>
      </li>
    </ul>
    <p
      v-if="error && comments.length"
      class="ot-notice ot-notice--error mt-3 mb-0"
      role="alert"
    >
      {{ error }}
    </p>
    <button
      v-if="hasMore"
      type="button"
      class="btn btn-outline-primary mt-3"
      :disabled="loadingMore"
      @click="$emit('load-more')"
    >
      {{ loadingMore ? 'Loading…' : 'Load more comments' }}
    </button>
  </div>
</template>

<style scoped>
/* Keep line breaks and wrap long words. Text is never read as HTML. */
.ot-comment-body {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
