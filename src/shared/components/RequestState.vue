<script setup>
defineProps({
  state: {
    type: String,
    required: true,
    validator: (value) =>
      ['loading', 'empty', 'error', 'success'].includes(value),
  },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  retry: { type: Boolean, default: false },
});
defineEmits(['retry']);
</script>
<template>
  <div
    :class="
      state === 'empty'
        ? 'ot-card ot-empty'
        : [
            'ot-notice',
            {
              'ot-notice--error': state === 'error',
              'ot-notice--success': state === 'success',
            },
          ]
    "
    :role="state === 'error' ? 'alert' : 'status'"
    :aria-busy="state === 'loading'"
  >
    <span
      v-if="state === 'loading'"
      class="spinner-border spinner-border-sm me-2"
      aria-hidden="true"
    ></span>
    <strong>{{
      title ||
      {
        loading: 'Loading…',
        empty: 'Nothing here yet',
        error: 'Something went wrong',
        success: 'Done',
      }[state]
    }}</strong>
    <p v-if="message">{{ message }}</p>
    <button
      v-if="retry && state === 'error'"
      type="button"
      class="btn btn-outline-primary mt-3"
      @click="$emit('retry')"
    >
      Try again
    </button>
    <slot />
  </div>
</template>
