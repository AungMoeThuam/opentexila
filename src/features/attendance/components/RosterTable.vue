<script setup>
import { computed } from 'vue';
import AttendanceStatusBadge from './AttendanceStatusBadge.vue';
import { formatTime } from '../../../shared/utils/format-datetime.js';

const props = defineProps({
  records: { type: Array, required: true },
});

const rows = computed(() =>
  props.records.map((record) => ({
    id: record.student_id,
    name: record.student?.name ?? '—',
    studentId: record.student_id,
    status: record.status,
    checkedIn: formatTime(record.checked_in_at),
  })),
);
</script>

<template>
  <div class="d-none d-md-block">
    <div
      class="table-responsive"
      tabindex="0"
      role="region"
      aria-label="Class roster, horizontally scrollable on small screens"
    >
      <table class="table ot-table align-middle mb-0">
        <caption class="visually-hidden">
          Class roster
        </caption>
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Status</th>
            <th scope="col">Checked in</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <th scope="row">
              <span class="fw-bold d-block">{{ row.name }}</span>
              <span class="ot-meta">ID {{ row.studentId }}</span>
            </th>
            <td>
              <AttendanceStatusBadge :status="row.status" />
            </td>
            <td>{{ row.checkedIn }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
    <li v-for="row in rows" :key="row.id">
      <article class="ot-card">
        <div
          class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3"
        >
          <div>
            <p class="fw-bold mb-0">{{ row.name }}</p>
            <p class="ot-meta mb-0">ID {{ row.studentId }}</p>
          </div>
          <AttendanceStatusBadge :status="row.status" />
        </div>
        <dl class="ot-dl mb-0">
          <div>
            <dt>Checked in</dt>
            <dd>{{ row.checkedIn }}</dd>
          </div>
        </dl>
      </article>
    </li>
  </ul>
</template>
