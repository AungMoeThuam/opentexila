<script setup>
import { computed } from 'vue';

const props = defineProps({
  meta: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  noun: { type: String, default: 'class' },
  pluralNoun: { type: String, default: 'classes' },
  label: { type: String, default: 'Enrolled classes pages' },
});

const emit = defineEmits(['change']);

const hasItems = computed(() => Boolean(props.meta) && props.meta.total > 0);
const showControls = computed(
  () => hasItems.value && props.meta.totalPages > 1,
);
const itemCountLabel = computed(() =>
  props.meta?.total === 1 ? props.noun : props.pluralNoun,
);

function goTo(page) {
  emit('change', page);
}
</script>

<template>
  <nav
    v-if="hasItems"
    class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4"
    :aria-label="label"
  >
    <div class="ot-meta" aria-live="polite">
      <span>Page {{ meta.page }} of {{ meta.totalPages }}</span>
      <span class="mx-2" aria-hidden="true">·</span>
      <span>{{ meta.total }} {{ itemCountLabel }}</span>
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
