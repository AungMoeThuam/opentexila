<script setup>
import { computed, useId } from 'vue';
import { classLabel, formatRate } from '../composables/use-chart-data.js';
import { AT_RISK_DEFAULT, AT_RISK_MAX } from '../services/analytics-query.js';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
  threshold: { type: Number, required: true },
  appliedThreshold: { type: Number, required: true },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['update-threshold']);

const uid = useId();
const labels = computed(
  () => new Map(props.classes.map((cls) => [cls.classId, classLabel(cls)])),
);
const labelFor = (classId) => labels.value.get(classId) ?? `Class ${classId}`;
const onThreshold = (event) =>
  emit(
    'update-threshold',
    event.target.value === '' ? Number.NaN : Number(event.target.value),
  );
</script>

<template>
  <section
    class="ot-card"
    :aria-labelledby="`${uid}-title`"
    :aria-busy="loading"
  >
    <div
      class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"
    >
      <div>
        <h2 :id="`${uid}-title`" class="ot-section-title mb-1">
          At-risk students
        </h2>
        <p class="ot-meta mb-0">
          Below {{ appliedThreshold }}% attendance rate, judged per class. Late
          counts as attended.
        </p>
      </div>
      <div>
        <label class="form-label mb-1" :for="`${uid}-threshold`">
          At-risk threshold (%)
        </label>
        <input
          :id="`${uid}-threshold`"
          type="number"
          class="form-control analytics-threshold"
          :class="{ 'is-invalid': error }"
          :min="AT_RISK_DEFAULT"
          :max="AT_RISK_MAX"
          step="1"
          inputmode="numeric"
          :value="Number.isNaN(threshold) ? '' : threshold"
          :aria-invalid="error ? 'true' : 'false'"
          :aria-describedby="error ? `${uid}-threshold-error` : undefined"
          @input="onThreshold"
        />
        <div
          v-if="error"
          :id="`${uid}-threshold-error`"
          class="invalid-feedback d-block"
          role="alert"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <p v-if="!rows.length" class="mb-0" role="status">
      No students are below {{ appliedThreshold }}% for these filters.
    </p>
    <div
      v-else
      class="table-responsive"
      tabindex="0"
      role="region"
      aria-label="At-risk students, horizontally scrollable on small screens"
    >
      <table class="table ot-table align-middle mb-0">
        <caption class="visually-hidden">
          At-risk students, lowest attendance rate first
        </caption>
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Class</th>
            <th scope="col" class="text-end">Sessions</th>
            <th scope="col" class="text-end">Present</th>
            <th scope="col" class="text-end">Late (counts as attended)</th>
            <th scope="col" class="text-end">Absent</th>
            <th scope="col" class="text-end">Attendance rate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.studentId}-${row.classId}`">
            <th scope="row">
              <span class="fw-bold d-block">{{ row.name }}</span>
              <span class="ot-meta">{{ row.email }}</span>
            </th>
            <td>{{ labelFor(row.classId) }}</td>
            <td class="text-end">{{ row.sessions }}</td>
            <td class="text-end">{{ row.present }}</td>
            <td class="text-end">{{ row.late }}</td>
            <td class="text-end">{{ row.absent }}</td>
            <td class="text-end fw-bold">
              {{ formatRate(row.attendanceRate) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.analytics-threshold {
  max-width: 8rem;
}
</style>
