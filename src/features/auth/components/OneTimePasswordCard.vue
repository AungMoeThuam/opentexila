<script setup>
// Shows a temporary password one time. The parent drops it on "done".
import { ref } from 'vue';

defineProps({
  heading: { type: String, required: true },
  user: { type: Object, required: true }, // { name, email, role }
  password: { type: String, required: true },
  doneLabel: { type: String, default: 'Done' },
});
const emit = defineEmits(['done']);
const title = ref();
const copyMessage = ref('');
defineExpose({ focus: () => title.value?.focus() });

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    copyMessage.value = 'Password copied.';
  } catch {
    copyMessage.value = 'Copy failed. Select the password and copy it.';
  }
}
</script>

<template>
  <section class="ot-card" aria-labelledby="one-time-password-title">
    <h2
      id="one-time-password-title"
      ref="title"
      class="ot-section-title"
      tabindex="-1"
    >
      {{ heading }}
    </h2>
    <p class="ot-notice ot-notice--success" role="status">
      Give this password to the user. It will not be shown again.
    </p>
    <dl class="row mb-3">
      <dt class="col-sm-3">Name</dt>
      <dd class="col-sm-9">{{ user.name }}</dd>
      <dt class="col-sm-3">Email</dt>
      <dd class="col-sm-9">{{ user.email }}</dd>
      <dt class="col-sm-3">Role</dt>
      <dd class="col-sm-9 text-capitalize">{{ user.role }}</dd>
      <dt class="col-sm-3">Temporary password</dt>
      <dd class="col-sm-9">
        <code class="fs-5 user-select-all">{{ password }}</code>
      </dd>
    </dl>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-primary" @click="copy(password)">
        Copy password
      </button>
      <button
        type="button"
        class="btn btn-outline-primary"
        @click="emit('done')"
      >
        {{ doneLabel }}
      </button>
    </div>
    <p class="ot-meta mt-3 mb-0" role="status" aria-live="polite">
      {{ copyMessage }}
    </p>
  </section>
</template>
