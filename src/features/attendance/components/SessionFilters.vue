<script setup>
import { useId } from 'vue';

const props = defineProps({
  filters: { type: Object, required: true },
  classOptions: { type: Array, default: () => [] },
  filterError: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['apply', 'clear']);

const uid = useId();
const classFieldId = `${uid}-class`;
const fromFieldId = `${uid}-from`;
const toFieldId = `${uid}-to`;
const errorId = `${uid}-error`;
</script>

<template>
  <div class="ot-card mb-4">
    <form class="row g-3 align-items-end" @submit.prevent="emit('apply')">
      <div class="col-12 col-md-4">
        <label class="form-label" :for="classFieldId">Class</label>
        <select
          :id="classFieldId"
          v-model="props.filters.classId"
          class="form-select"
        >
          <option value="">All classes</option>
          <option
            v-for="option in props.classOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="col-12 col-sm-6 col-md-2">
        <label class="form-label" :for="fromFieldId">From</label>
        <input
          :id="fromFieldId"
          v-model="props.filters.from"
          type="date"
          class="form-control"
          :class="{ 'is-invalid': filterError }"
          :aria-invalid="filterError ? 'true' : 'false'"
          :aria-describedby="filterError ? errorId : undefined"
        />
      </div>

      <div class="col-12 col-sm-6 col-md-2">
        <label class="form-label" :for="toFieldId">To</label>
        <input
          :id="toFieldId"
          v-model="props.filters.to"
          type="date"
          class="form-control"
          :class="{ 'is-invalid': filterError }"
          :aria-invalid="filterError ? 'true' : 'false'"
          :aria-describedby="filterError ? errorId : undefined"
        />
      </div>

      <div class="col-12 col-md-4 d-flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          Apply filters
        </button>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="loading"
          @click="emit('clear')"
        >
          Clear
        </button>
      </div>

      <div v-if="filterError" class="col-12">
        <div :id="errorId" class="ot-notice ot-notice--error mb-0" role="alert">
          {{ filterError }}
        </div>
      </div>
    </form>
  </div>
</template>
