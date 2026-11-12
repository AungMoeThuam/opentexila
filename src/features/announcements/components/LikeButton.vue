<script setup>
// Heart button with the like count. `readonly` shows the count only, for a
// user who may not like (an admin). The page owns the state and the request.
import { computed } from 'vue';
import { plural } from '../services/announcement-options.js';

const props = defineProps({
  liked: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});
defineEmits(['toggle']);

const countText = computed(() => plural(props.count, 'like', 'likes'));
</script>

<template>
  <p v-if="readonly" class="ot-meta mb-0" data-test="like-count">
    {{ countText }}
  </p>
  <button
    v-else
    type="button"
    class="btn btn-sm ot-like-button"
    :class="liked ? 'btn-primary' : 'btn-outline-primary'"
    :aria-pressed="liked"
    :aria-label="`${liked ? 'Unlike' : 'Like'}. ${countText}`"
    :disabled="busy"
    @click="$emit('toggle')"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      :fill="liked ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"
      />
    </svg>
    <span class="ms-2" data-test="like-count">{{ countText }}</span>
  </button>
</template>
