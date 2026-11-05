<script setup>
import { computed } from 'vue';

const props = defineProps({
  enrolments: { type: Array, required: true },
});

const rows = computed(() =>
  props.enrolments.map((enrolment) => ({
    id: enrolment.student_id,
    studentId: enrolment.student?.id ?? enrolment.student_id,
    name: enrolment.student?.name ?? '—',
    email: enrolment.student?.email ?? '—',
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
            <th scope="col">Student ID</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.studentId }}</td>
            <th scope="row">{{ row.name }}</th>
            <td>{{ row.email }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
    <li v-for="row in rows" :key="row.id">
      <article class="ot-card">
        <p class="fw-bold mb-0">{{ row.name }}</p>
        <p class="ot-meta mb-0">ID {{ row.studentId }}</p>
        <p class="ot-meta mb-0">{{ row.email }}</p>
      </article>
    </li>
  </ul>
</template>
