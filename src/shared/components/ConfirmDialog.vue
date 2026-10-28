<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
const props = defineProps({
  open: Boolean,
  busy: Boolean,
  title: { type: String, required: true },
  message: { type: String, default: '' },
  error: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
});
const emit = defineEmits(['confirm', 'cancel']);
const dialog = ref();
const cancelButton = ref();
const id = useId();
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (!dialog.value) return;
    if (open && !dialog.value.open) {
      dialog.value.showModal();
      cancelButton.value.focus();
    } else if (!open && dialog.value.open) dialog.value.close();
  },
  { immediate: true },
);
function cancel(event) {
  event?.preventDefault();
  if (!props.busy) emit('cancel');
}
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <dialog
    ref="dialog"
    class="ot-dialog ot-card"
    :aria-labelledby="`${id}-title`"
    :aria-describedby="`${id}-message`"
    :aria-busy="busy"
    @cancel="cancel"
  >
    <h2 :id="`${id}-title`" class="ot-section-title">{{ title }}</h2>
    <p :id="`${id}-message`">{{ message }}</p>
    <p v-if="error" class="ot-notice ot-notice--error" role="alert">
      {{ error }}
    </p>
    <div class="d-flex flex-wrap justify-content-end gap-3 mt-4">
      <button
        ref="cancelButton"
        type="button"
        class="btn btn-outline-primary"
        :disabled="busy"
        @click="cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ busy ? 'Working…' : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
