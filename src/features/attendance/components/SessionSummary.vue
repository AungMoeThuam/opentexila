<script setup>
import { formatDate } from '../services/attendance';
defineProps({ session: { type: Object, required: true } });
const labels = {
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  ended: 'Ended',
  cancelled: 'Cancelled',
  pending: 'Pending',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
};
</script>
<template>
  <div class="d-flex flex-wrap gap-2 mb-3">
    <span
      class="ot-status"
      :class="
        session.availability === 'in_progress'
          ? 'ot-status--live'
          : 'ot-status--closed'
      "
      >{{ labels[session.availability] || session.availability }}</span
    >
    <span
      class="ot-status"
      :class="`ot-status--${session.my_attendance?.status || 'pending'}`"
      >Attendance:
      {{ labels[session.my_attendance?.status || 'pending'] }}</span
    >
  </div>
  <dl class="ot-dl">
    <div>
      <dt>Section / term</dt>
      <dd>{{ session.class.section }} · {{ session.class.term }}</dd>
    </div>
    <div>
      <dt>Room</dt>
      <dd>
        {{ session.room_label || session.class.room_label || 'Not assigned' }}
      </dd>
    </div>
    <div>
      <dt>Starts</dt>
      <dd>
        <time :datetime="session.starts_at">{{
          formatDate(session.starts_at)
        }}</time>
      </dd>
    </div>
    <div>
      <dt>Ends</dt>
      <dd>
        <time :datetime="session.ends_at">{{
          formatDate(session.ends_at)
        }}</time>
      </dd>
    </div>
  </dl>
</template>
