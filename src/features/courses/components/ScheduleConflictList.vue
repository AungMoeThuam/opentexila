<script setup>
// The sessions that clash with the times being entered: why, which class,
// when and where, with a link to that class's schedule.
import { formatSessionWindow } from '../../../shared/utils/format-datetime.js';
import { reasonText } from '../services/session-conflicts.js';

defineProps({
  conflicts: { type: Array, required: true },
});

const windowOf = (session) =>
  formatSessionWindow(session.starts_at, session.ends_at);
const classText = (session) =>
  [
    session.class?.course?.code,
    session.class?.section ? `Section ${session.class.section}` : '',
    session.class?.term,
  ]
    .filter(Boolean)
    .join(' · ');
</script>

<template>
  <ul class="list-unstyled d-grid gap-2 mb-0" aria-label="Clashing sessions">
    <li v-for="item in conflicts" :key="item.session.id" data-test="conflict">
      <p class="fw-semibold mb-0" data-test="conflict-reason">
        {{ reasonText(item.types) }}
      </p>
      <p class="mb-0">
        {{ classText(item.session) }}
        <template v-if="item.session.lecturer?.name">
          · {{ item.session.lecturer.name }}</template
        >
      </p>
      <p class="mb-0">
        {{ windowOf(item.session).date }}, {{ windowOf(item.session).time }} ·
        {{ item.session.room_label }}
        <RouterLink
          v-if="item.session.class?.id"
          class="ms-2"
          :to="{
            name: 'admin-class-schedule',
            params: { classId: item.session.class.id },
          }"
          >Open schedule</RouterLink
        >
      </p>
    </li>
  </ul>
</template>
