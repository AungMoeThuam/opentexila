<script setup>
import {
  notifications,
  dismissNotification,
} from '../composables/notifications';
</script>
<template>
  <section
    class="ot-notifications"
    aria-label="Notifications"
    aria-live="polite"
    aria-relevant="additions"
  >
    <div
      v-for="item in notifications"
      :key="item.id"
      class="ot-notice ot-notification"
      :class="`ot-notice--${item.type}`"
    >
      <span>{{ item.message }}</span>
      <button
        type="button"
        class="ot-icon-btn flex-shrink-0"
        aria-label="Dismiss notification"
        @click="dismissNotification(item.id)"
      >
        ×
      </button>
    </div>
  </section>
</template>
