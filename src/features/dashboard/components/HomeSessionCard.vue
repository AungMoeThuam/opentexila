<script setup>
import { computed } from 'vue';
import AvailabilityBadge from '../../attendance/components/AvailabilityBadge.vue';
import { formatSessionWindow } from '../../../shared/utils/format-datetime.js';

const props = defineProps({
  session: { type: Object, required: true },
});

const view = computed(() => {
  const { course, section, room_label: room } = props.session.class;
  const { date, time } = formatSessionWindow(
    props.session.starts_at,
    props.session.ends_at,
  );
  return {
    code: course.code,
    name: course.name,
    section,
    room: room || '—',
    date,
    time,
    path: `/lecturer/class-sessions/${props.session.id}`,
    label: `View attendance for ${course.code} on ${date}`,
  };
});
</script>

<template>
  <div
    class="ot-card d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-center p-3"
  >
    <div>
      <h3 class="ot-card__title mb-1">
        {{ view.code }} {{ view.name }}
        <span class="ot-meta">· Section {{ view.section }}</span>
      </h3>
      <p class="ot-meta mb-0">
        {{ view.date }}, {{ view.time }} · Room {{ view.room }}
      </p>
    </div>
    <div class="d-flex align-items-center gap-3">
      <AvailabilityBadge :availability="session.availability" />
      <router-link
        class="btn btn-outline-primary btn-sm"
        :to="view.path"
        :aria-label="view.label"
      >
        View attendance
      </router-link>
    </div>
  </div>
</template>
