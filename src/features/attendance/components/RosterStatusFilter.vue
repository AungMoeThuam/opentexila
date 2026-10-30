<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['change']);

const options = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

function select(value) {
  if (value !== props.modelValue) emit('change', value);
}
</script>

<template>
  <div
    class="d-flex flex-wrap gap-2"
    role="group"
    aria-label="Filter by attendance status"
  >
    <button
      v-for="option in options"
      :key="option.value || 'all'"
      type="button"
      class="btn btn-outline-primary"
      :class="{ active: option.value === modelValue }"
      :aria-pressed="option.value === modelValue ? 'true' : 'false'"
      :disabled="disabled"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
