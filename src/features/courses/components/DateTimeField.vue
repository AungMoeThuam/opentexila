<script setup>
import { computed, reactive, watch } from 'vue';
import {
  HOURS,
  joinDateTime,
  minuteOptions,
  splitDateTime,
  withDefaultTime,
} from '../services/date-time-parts.js';

// A date and a time of day, chosen from a date picker and two lists (hour and
// minute, 24-hour clock). The value is "YYYY-MM-DDTHH:mm", or '' while the
// date or the time is not chosen. `id` goes on the date field so a label can
// point at it. `change` fires after the value is updated.
const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedby: { type: String, default: undefined },
});
const emit = defineEmits(['update:modelValue', 'change']);

const parts = reactive(splitDateTime(props.modelValue));

// A value set from outside (the late and end times follow the start time).
watch(
  () => props.modelValue,
  (value) => {
    if (value === joinDateTime(parts)) return;
    Object.assign(parts, splitDateTime(value));
  },
);

const minutes = computed(() => minuteOptions(parts.minute));

function update() {
  Object.assign(parts, withDefaultTime(parts));
  const value = joinDateTime(parts);
  emit('update:modelValue', value);
  emit('change', value);
}
</script>

<template>
  <div
    class="datetime-field"
    role="group"
    :aria-label="label"
    :aria-describedby="describedby"
  >
    <input
      :id="id"
      v-model="parts.date"
      class="form-control datetime-field__date"
      :class="{ 'is-invalid': invalid }"
      type="date"
      :disabled="disabled"
      :aria-invalid="invalid"
      @change="update"
    />
    <div class="datetime-field__time">
      <select
        v-model="parts.hour"
        class="form-select"
        :class="{ 'is-invalid': invalid }"
        :aria-label="`${label}, hour`"
        :disabled="disabled"
        @change="update"
      >
        <option value="" disabled>HH</option>
        <option v-for="hour in HOURS" :key="hour" :value="hour">
          {{ hour }}
        </option>
      </select>
      <span class="datetime-field__colon" aria-hidden="true">:</span>
      <select
        v-model="parts.minute"
        class="form-select"
        :class="{ 'is-invalid': invalid }"
        :aria-label="`${label}, minute`"
        :disabled="disabled"
        @change="update"
      >
        <option value="" disabled>MM</option>
        <option v-for="minute in minutes" :key="minute" :value="minute">
          {{ minute }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.datetime-field {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ot-space-2);
}
.datetime-field__date {
  flex: 1 1 9.5rem;
  min-width: 9.5rem;
}
.datetime-field__time {
  display: flex;
  align-items: center;
  gap: var(--ot-space-1);
}
.datetime-field__time .form-select {
  width: auto;
  min-width: 4.75rem;
}
.datetime-field__colon {
  font-weight: var(--ot-weight-bold);
}
</style>
