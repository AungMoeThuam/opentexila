<script setup>
// Password input with Show/Hide and Generate buttons for temporary passwords.
import { ref } from 'vue';
import FormField from '../../courses/components/FormField.vue';
import { generateTemporaryPassword } from '../services/admin-user-validation.js';

defineProps({
  id: { type: String, required: true },
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Temporary password' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
const visible = ref(false);

function generate() {
  emit('update:modelValue', generateTemporaryPassword());
  // The admin must see a generated password to pass it on.
  visible.value = true;
}
</script>

<template>
  <FormField
    :id="id"
    :label="label"
    required
    :error="error"
    hint="At least 12 characters. The user must change it at first sign-in."
  >
    <template #default="field">
      <div class="input-group">
        <input
          :id="field.id"
          :value="modelValue"
          class="form-control font-monospace"
          :class="{ 'is-invalid': field.invalid }"
          :type="visible ? 'text' : 'password'"
          maxlength="1024"
          autocomplete="new-password"
          autocapitalize="off"
          spellcheck="false"
          required
          :disabled="disabled"
          :aria-invalid="field.invalid"
          :aria-describedby="field.describedby"
          @input="emit('update:modelValue', $event.target.value)"
        />
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="disabled"
          :aria-pressed="visible"
          :aria-controls="field.id"
          @click="visible = !visible"
        >
          {{ visible ? 'Hide' : 'Show' }}
        </button>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="disabled"
          @click="generate"
        >
          Generate
        </button>
      </div>
    </template>
  </FormField>
</template>
