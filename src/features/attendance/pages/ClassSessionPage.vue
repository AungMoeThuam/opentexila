<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionSummary from '../components/SessionSummary.vue';
import {
  createAttendanceService,
  errorMessage,
  formatDate,
  messages,
  readLocation,
} from '../services/attendance';
const route = useRoute();
const service = createAttendanceService(api);
const session = ref(null);
const loading = ref(false);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const phase = ref('');
let controller;
const confirmed = computed(() =>
  ['present', 'late'].includes(session.value?.my_attendance?.status),
);
const allowed = computed(
  () => session.value?.check_in?.allowed === true && !confirmed.value,
);
async function load() {
  controller?.abort();
  const current = (controller = new AbortController());
  session.value = null;
  loading.value = true;
  busy.value = false;
  error.value = '';
  actionError.value = '';
  try {
    const result = await service.detail(
      route.params.classSessionId,
      current.signal,
    );
    if (!current.signal.aborted) session.value = result.data;
  } catch (failure) {
    if (!current.signal.aborted) error.value = errorMessage(failure);
  } finally {
    if (!current.signal.aborted) loading.value = false;
  }
}
async function checkIn() {
  if (busy.value || !allowed.value) return;
  const current = controller;
  const id = session.value.id;
  busy.value = true;
  actionError.value = '';
  phase.value = 'Finding your location…';
  try {
    const reading = await readLocation();
    if (current.signal.aborted) return;
    phase.value = 'Submitting check-in…';
    const result = await service.checkIn(id, reading, current.signal);
    if (current.signal.aborted) return;
    const record = result?.data?.attendance_record;
    if (!['present', 'late'].includes(record?.status) || !record.checked_in_at)
      throw new Error(
        'The server did not confirm your attendance. Refresh the session before trying again.',
      );
    session.value = {
      ...session.value,
      my_attendance: record,
      check_in: { allowed: false, reason: 'ALREADY_CHECKED_IN' },
    };
  } catch (failure) {
    if (current.signal.aborted) return;
    actionError.value = errorMessage(failure);
    if (
      [
        'NOT_STARTED',
        'CLASS_NOT_STARTED',
        'CLASS_ENDED',
        'CLASS_CANCELLED',
        'ALREADY_CHECKED_IN',
        'NOT_ELIGIBLE',
        'ROLE_NOT_STUDENT',
      ].includes(failure.code)
    ) {
      session.value.check_in = { allowed: false, reason: failure.code };
      // Refresh authoritative status without replaying the mutation.
      try {
        const result = await service.detail(id, current.signal);
        if (!current.signal.aborted) session.value = result.data;
      } catch {
        /* Keep the action error and allow an explicit refresh. */
      }
    }
  } finally {
    if (!current.signal.aborted) busy.value = false;
  }
}
watch(() => route.params.classSessionId, load, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>
<template>
  <RouterLink class="d-inline-block mb-4" :to="{ name: 'student-attendance' }"
    >← Scheduled classes</RouterLink
  >
  <header class="ot-page-header">
    <div>
      <p class="ot-eyebrow">Student attendance</p>
      <h1 class="ot-page-title">Class check-in</h1>
      <p class="ot-subtitle">Times use your device’s timezone.</p>
    </div>
    <button
      class="btn btn-outline-primary"
      :disabled="loading || busy"
      @click="load"
    >
      Refresh session
    </button>
  </header>
  <RequestState v-if="loading" state="loading" title="Loading class session…" />
  <RequestState
    v-else-if="error"
    state="error"
    title="Unable to load this session"
    :message="error"
    retry
    @retry="load"
  />
  <div v-else-if="session" class="row g-4">
    <div class="col-12 col-lg-7">
      <section class="ot-card">
        <p class="ot-eyebrow">{{ session.class.course.code }}</p>
        <h2 class="ot-section-title mb-3">{{ session.class.course.name }}</h2>
        <SessionSummary :session="session" />
        <p class="ot-meta mt-3 mb-0">
          Late after {{ formatDate(session.late_after) }}.
        </p>
      </section>
    </div>
    <div class="col-12 col-lg-5">
      <section
        class="ot-card"
        aria-labelledby="check-in-heading"
        :aria-busy="busy"
      >
        <h2 id="check-in-heading" class="ot-section-title">Your check-in</h2>
        <RequestState
          v-if="confirmed"
          state="success"
          :title="
            session.my_attendance.status === 'late'
              ? 'Checked in · Late'
              : 'Checked in · Present'
          "
          :message="`Recorded at ${formatDate(session.my_attendance.checked_in_at)}`"
        />
        <p v-else-if="!allowed" class="ot-notice" role="status">
          {{
            messages[session.check_in?.reason] ||
            'Check-in is unavailable for this session.'
          }}
        </p>
        <p v-else class="ot-subtitle mb-3">
          When you are in the classroom, check in using your current location.
          Your browser will ask for permission.
        </p>
        <div
          v-if="actionError"
          class="ot-notice ot-notice--error my-3"
          role="alert"
        >
          {{ actionError }}
        </div>
        <button
          v-if="allowed"
          class="btn btn-primary w-100"
          :disabled="busy"
          @click="checkIn"
        >
          {{ busy ? phase : actionError ? 'Try check-in again' : 'Check in' }}
        </button>
        <p v-if="busy" class="ot-meta mt-2" role="status">{{ phase }}</p>
      </section>
    </div>
  </div>
</template>
