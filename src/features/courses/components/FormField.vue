<script setup>
// Label, control slot, hint and error with matching ids for screen readers.
// The slot receives `{ id, describedby, invalid }` to bind on the control.
import { computed } from 'vue';

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
});
const describedby = computed(
  () =>
    [props.hint && `${props.id}-hint`, props.error && `${props.id}-error`]
      .filter(Boolean)
      .join(' ') || undefined,
);
</script>

<template>
  <div>
    <label class="form-label" :for="id"
      >{{ label
      }}<span v-if="required" class="text-danger" aria-hidden="true">
        *</span
      ></label
    >
    <slot :id="id" :describedby="describedby" :invalid="Boolean(error)" />
    <div v-if="hint" :id="`${id}-hint`" class="form-text">{{ hint }}</div>
    <div v-if="error" :id="`${id}-error`" class="invalid-feedback d-block">
      {{ error }}
    </div>
  </div>
</template>
