<script setup>
import { computed } from 'vue';
import {
  formatSessionWindow,
  formatTime,
} from '../../../shared/utils/format-datetime.js';

const props = defineProps({
  context: { type: Object, required: true },
});

const details = computed(() => {
  const session = props.context;
  const cls = session.class ?? {};
  const { date, time } = formatSessionWindow(
    session.starts_at,
    session.ends_at,
  );

  return {
    code: cls.course?.code ?? '',
    name: cls.course?.name ?? '',
    sectionTerm: [cls.section, cls.term].filter(Boolean).join(' / ') || '—',
    lecturer: cls.lecturer?.name || '—',
    room: cls.room_label || '—',
    date,
    time,
    lateAfter: formatTime(session.late_after),
    cancelled: session.class_state === 'cancelled',
  };
});
</script>

<template>
  <div class="ot-card mb-4">
    <router-link class="d-inline-block mb-3" to="/lecturer/attendance">
      Back to class sessions
    </router-link>
    <h1 class="ot-page-title mb-3">{{ details.code }} · {{ details.name }}</h1>
    <dl class="ot-dl mb-0">
      <div>
        <dt>Section / Term</dt>
        <dd>{{ details.sectionTerm }}</dd>
      </div>
      <div>
        <dt>Lecturer</dt>
        <dd>{{ details.lecturer }}</dd>
      </div>
      <div>
        <dt>Room</dt>
        <dd>{{ details.room }}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{{ details.date }}</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>{{ details.time }}</dd>
      </div>
      <div>
        <dt>Late after</dt>
        <dd>{{ details.lateAfter }}</dd>
      </div>
    </dl>
    <div
      v-if="details.cancelled"
      class="ot-notice ot-notice--warning mt-4 mb-0"
    >
      This class session is cancelled.
    </div>
  </div>
</template>
