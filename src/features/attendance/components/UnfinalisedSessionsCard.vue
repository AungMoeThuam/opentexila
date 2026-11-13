<script setup>
import { computed, useId } from 'vue';
import { classLabel } from '../composables/use-chart-data.js';
import {
  SUBMITTING_LABEL,
  SUBMIT_LABEL,
  SUBMIT_WARNING,
  waitingDetails,
} from '../services/waiting-sessions.js';

// Class sessions that have ended but still have pending records: the lecturer
// submits the attendance record, and pending students are marked absent.
const props = defineProps({
  sessions: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
  // The room of each session, by session id (see use-session-rooms.js).
  rooms: { type: Object, default: () => ({}) },
  finalisingId: { type: Number, default: null },
  error: { type: String, default: null },
});
const emit = defineEmits(['finalise']);

const uid = useId();
const labels = computed(
  () => new Map(props.classes.map((cls) => [cls.classId, classLabel(cls)])),
);
const labelFor = (classId) => labels.value.get(classId) ?? `Class ${classId}`;
</script>

<template>
  <section class="ot-card mb-4" :aria-labelledby="`${uid}-title`">
    <h2 :id="`${uid}-title`" class="ot-section-title mb-1">
      Attendance records waiting to be submitted
    </h2>
    <p class="ot-meta">
      These class sessions have ended but still have pending records. They stay
      out of every number on this page until you submit the attendance record.
      {{ SUBMIT_WARNING }}
    </p>

    <div v-if="error" class="ot-notice ot-notice--error mb-3" role="alert">
      {{ error }}
    </div>

    <ul class="list-unstyled d-grid gap-3 mb-0">
      <li
        v-for="session in sessions"
        :key="session.classSessionId"
        class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-2"
      >
        <span class="flex-grow-1" style="min-width: 0">
          <span class="fw-bold d-block">{{ labelFor(session.classId) }}</span>
          <span class="ot-meta">{{ waitingDetails(session, rooms) }}</span>
        </span>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary flex-shrink-0 align-self-start align-self-md-center"
          :disabled="finalisingId !== null"
          :aria-label="`${SUBMIT_LABEL} for ${labelFor(session.classId)}, ${waitingDetails(session, rooms)}`"
          @click="emit('finalise', session.classSessionId)"
        >
          {{
            finalisingId === session.classSessionId
              ? SUBMITTING_LABEL
              : SUBMIT_LABEL
          }}
        </button>
      </li>
    </ul>
  </section>
</template>
