<script setup>
import { useId } from 'vue';

const props = defineProps({
  filters: { type: Object, required: true },
  errors: { type: Object, default: null },
  classOptions: { type: Array, default: () => [] },
  classOptionsError: { type: Object, default: null },
});
const emit = defineEmits(['update', 'retry-classes']);

const uid = useId();
</script>

<template>
  <div class="ot-card mb-4">
    <form class="row g-3 align-items-start" @submit.prevent>
      <div class="col-12 col-md-6">
        <label class="form-label" :for="`${uid}-class`">Class</label>
        <select
          :id="`${uid}-class`"
          class="form-select"
          :value="props.filters.classId"
          @change="emit('update', { classId: $event.target.value })"
        >
          <option value="">All my classes</option>
          <option
            v-for="option in props.classOptions"
            :key="option.id"
            :value="String(option.id)"
          >
            {{ option.label }}
          </option>
        </select>
        <div
          v-if="props.classOptionsError"
          class="ot-notice ot-notice--warning mt-2 mb-0"
          role="alert"
        >
          Could not load your classes.
          <button
            type="button"
            class="btn btn-link p-0 align-baseline"
            @click="emit('retry-classes')"
          >
            Retry
          </button>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label" :for="`${uid}-from`">From</label>
        <input
          :id="`${uid}-from`"
          type="date"
          class="form-control"
          :class="{ 'is-invalid': props.errors?.from }"
          :value="props.filters.from"
          :aria-invalid="props.errors?.from ? 'true' : 'false'"
          :aria-describedby="
            props.errors?.from ? `${uid}-from-error` : undefined
          "
          @input="emit('update', { from: $event.target.value })"
        />
        <div
          v-if="props.errors?.from"
          :id="`${uid}-from-error`"
          class="invalid-feedback d-block"
          role="alert"
        >
          {{ props.errors.from }}
        </div>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label" :for="`${uid}-to`">To</label>
        <input
          :id="`${uid}-to`"
          type="date"
          class="form-control"
          :class="{ 'is-invalid': props.errors?.to }"
          :value="props.filters.to"
          :aria-invalid="props.errors?.to ? 'true' : 'false'"
          :aria-describedby="props.errors?.to ? `${uid}-to-error` : undefined"
          @input="emit('update', { to: $event.target.value })"
        />
        <div
          v-if="props.errors?.to"
          :id="`${uid}-to-error`"
          class="invalid-feedback d-block"
          role="alert"
        >
          {{ props.errors.to }}
        </div>
      </div>
    </form>
  </div>
</template>
