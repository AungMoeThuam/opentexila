<script setup>
import { nextTick, onBeforeUnmount, useId, watch } from 'vue';
import { ref } from 'vue';
import TemporaryPasswordField from './TemporaryPasswordField.vue';

const props = defineProps({
  open: Boolean,
  busy: Boolean,
  user: { type: Object, default: null }, // { id, name, email }
  password: { type: String, default: '' },
  fieldError: { type: String, default: '' },
  error: { type: String, default: '' },
});
const emit = defineEmits(['update:password', 'submit', 'cancel']);
const dialog = ref();
const id = useId();

watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (!dialog.value) return;
    if (open && !dialog.value.open) dialog.value.showModal();
    else if (!open && dialog.value.open) dialog.value.close();
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
    :aria-busy="busy"
    @cancel="cancel"
  >
    <form novalidate @submit.prevent="emit('submit')">
      <h2 :id="`${id}-title`" class="ot-section-title">Reset password</h2>
      <p v-if="user">
        Set a new temporary password for <strong>{{ user.name }}</strong> ({{
          user.email
        }}). All their sign-ins end, and they must change the password at the
        next sign-in.
      </p>
      <p v-if="error" class="ot-notice ot-notice--error" role="alert">
        {{ error }}
      </p>
      <TemporaryPasswordField
        :id="`${id}-password`"
        label="New temporary password"
        :model-value="password"
        :error="fieldError"
        :disabled="busy"
        @update:model-value="emit('update:password', $event)"
      />
      <div class="d-flex flex-wrap justify-content-end gap-3 mt-4">
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="busy"
          @click="cancel"
        >
          Cancel
        </button>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? 'Resetting…' : 'Reset password' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
