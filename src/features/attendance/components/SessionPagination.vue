<script setup>
import { computed } from 'vue';

const props = defineProps({
  meta: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['change']);

const hasSessions = computed(() => Boolean(props.meta) && props.meta.total > 0);
const showControls = computed(
  () => hasSessions.value && props.meta.totalPages > 1,
);
const sessionLabel = computed(() =>
  props.meta?.total === 1 ? 'session' : 'sessions',
);

function goTo(page) {
  emit('change', page);
}
</script>

<template>
  <nav
    v-if="hasSessions"
    class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4"
    aria-label="Class sessions pages"
  >
    <div class="ot-meta" aria-live="polite">
      <span>Page {{ meta.page }} of {{ meta.totalPages }}</span>
      <span class="mx-2" aria-hidden="true">·</span>
      <span>{{ meta.total }} {{ sessionLabel }}</span>
    </div>

    <div v-if="showControls" class="d-flex gap-2">
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="disabled || meta.page <= 1"
        @click="goTo(meta.page - 1)"
      >
        Previous
      </button>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="disabled || meta.page >= meta.totalPages"
        @click="goTo(meta.page + 1)"
      >
        Next
      </button>
    </div>
  </nav>
</template>
