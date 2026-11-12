<script setup>
// Text area for a new comment, with a counter. The text stays when sending
// fails. The page clears it after a comment is saved.
import { computed, ref } from 'vue';
import FormField from '../../courses/components/FormField.vue';
import {
  MAX_COMMENT,
  charactersLeft,
} from '../services/announcement-validation.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'submit']);

const field = ref();
const left = computed(() => charactersLeft(props.modelValue, MAX_COMMENT));
const counter = computed(() =>
  left.value >= 0
    ? `${left.value} characters left`
    : `${-left.value} characters too many`,
);

defineExpose({ focus: () => field.value?.focus() });
</script>

<template>
  <form novalidate :aria-busy="busy" @submit.prevent="emit('submit')">
    <FormField
      id="comment-body"
      label="Write a comment"
      :error="error"
      :hint="counter"
    >
      <template #default="control">
        <textarea
          :id="control.id"
          ref="field"
          class="form-control"
          :class="{ 'is-invalid': control.invalid }"
          rows="3"
          :value="modelValue"
          :disabled="busy"
          :aria-invalid="control.invalid"
          :aria-describedby="control.describedby"
          @input="emit('update:modelValue', $event.target.value)"
        ></textarea>
      </template>
    </FormField>
    <button type="submit" class="btn btn-primary mt-3" :disabled="busy">
      <span
        v-if="busy"
        class="spinner-border spinner-border-sm me-2"
        aria-hidden="true"
      ></span>
      {{ busy ? 'Sending…' : 'Post comment' }}
    </button>
  </form>
</template>
