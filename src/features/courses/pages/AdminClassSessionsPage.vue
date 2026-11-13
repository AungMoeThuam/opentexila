<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import {
  formatSessionWindow,
  formatTime,
} from '../../../shared/utils/format-datetime.js';
import AvailabilityBadge from '../../attendance/components/AvailabilityBadge.vue';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import { usePagedList } from '../composables/use-paged-list.js';
import { classSessionsService } from '../services/index.js';
import {
  parseHighlightId,
  sessionAnchor,
} from '../services/session-highlight.js';
import { ADMIN_TIME_ZONE_LABEL } from '../services/zoned-time.js';

const route = useRoute();
const router = useRouter();
const classId = computed(() => route.params.classId);
const stateFilter = ref('');
const context = ref(null);

// The class summary comes with every page, so the heading needs no extra call.
const {
  rows: sessions,
  meta,
  loading,
  error,
  load,
  reload,
  setPage,
  cancel,
} = usePagedList(
  async (params, options) => {
    const result = await classSessionsService.list(
      classId.value,
      params,
      options,
    );
    context.value = result.context?.class ?? null;
    return result;
  },
  { filters: () => (stateFilter.value ? { state: stateFilter.value } : {}) },
);

const notFound = computed(() => error.value?.status === 404);

// The session the address points at, shown with a highlight. It is the
// session that overlaps the one the admin was scheduling.
const highlightId = computed(() => parseHighlightId(route.query.session));
const highlightFound = computed(
  () =>
    highlightId.value !== null &&
    sessions.value.some((session) => session.id === highlightId.value),
);
const highlightMissing = computed(
  () =>
    highlightId.value !== null &&
    !loading.value &&
    !error.value &&
    sessions.value.length > 0 &&
    !highlightFound.value,
);
let scrolledTo = null;
watch([sessions, highlightId], async () => {
  if (!highlightFound.value || scrolledTo === highlightId.value) return;
  scrolledTo = highlightId.value;
  await nextTick();
  const row = document.getElementById(sessionAnchor(highlightId.value));
  if (!row) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  row.focus({ preventScroll: true });
});
const heading = computed(() =>
  context.value
    ? `${context.value.course?.code} · Section ${context.value.section} · ${context.value.term}`
    : 'Class sessions',
);

const confirming = ref(null); // the session being cancelled
const cancelling = ref(false);
const cancelError = ref('');
let active = true;

// A session can be cancelled until it has ended.
const canCancel = (session) =>
  session.state === 'scheduled' &&
  ['upcoming', 'in_progress'].includes(session.availability);

const windowOf = (session) =>
  formatSessionWindow(session.starts_at, session.ends_at);
const counts = (session) =>
  `Present ${session.attendance.present} · Late ${session.attendance.late} · Absent ${session.attendance.absent} · Pending ${session.attendance.pending}`;
const cancelMessage = computed(() =>
  confirming.value?.availability === 'in_progress'
    ? 'This session is in progress. Students who already checked in keep their attendance, and nobody can check in after it is cancelled. This cannot be undone.'
    : 'Students will no longer be able to check in. This cannot be undone.',
);

function askCancel(session) {
  cancelError.value = '';
  confirming.value = session;
}

async function confirmCancel() {
  if (cancelling.value || !confirming.value) return;
  cancelling.value = true;
  cancelError.value = '';
  try {
    await classSessionsService.cancel(confirming.value.id);
    if (!active) return;
    confirming.value = null;
    notify('Session cancelled.', 'success');
    await load();
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN') {
      confirming.value = null;
      return router.replace({ name: 'forbidden' });
    }
    if (cause?.code === 'CLASS_SESSION_ENDED') {
      // The list was out of date. Show the real state.
      cancelError.value =
        'This session has already ended, so it cannot be cancelled.';
      await load();
      return;
    }
    if (cause?.status === 404) {
      confirming.value = null;
      await load();
      return;
    }
    cancelError.value = cause?.message || 'The session could not be cancelled.';
  } finally {
    cancelling.value = false;
  }
}

function changeFilter() {
  reload();
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
watch(classId, () => reload());
onMounted(load);
onBeforeUnmount(() => {
  active = false;
  cancel();
});
</script>

<template>
  <div class="ot-page-content">
    <RouterLink class="d-inline-block mb-4" :to="{ name: 'admin-classes' }"
      >← All classes</RouterLink
    >
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Classes</p>
        <h1 class="ot-page-title">Class schedule</h1>
        <p class="ot-subtitle">
          <template v-if="context"
            >{{ heading }} · {{ context.course?.name }} ·
            {{ context.lecturer?.name }}</template
          >
          <template v-else>Sessions of this class.</template>
        </p>
        <p class="ot-meta mb-0">
          Times are shown in {{ ADMIN_TIME_ZONE_LABEL }}.
        </p>
      </div>
      <RouterLink
        v-if="!notFound"
        class="btn btn-primary"
        :to="{ name: 'admin-class-session-new', params: { classId } }"
        >Schedule a session</RouterLink
      >
    </header>

    <div v-if="notFound" class="ot-card ot-empty">
      <h2 class="ot-section-title">Class not found</h2>
      <p class="ot-meta">This class does not exist.</p>
      <RouterLink
        class="btn btn-outline-primary"
        :to="{ name: 'admin-classes' }"
        >Back to classes</RouterLink
      >
    </div>
    <template v-else>
      <div class="ot-card mb-4">
        <label class="form-label" for="session-filter-state">Show</label>
        <select
          id="session-filter-state"
          v-model="stateFilter"
          class="form-select w-auto"
          :disabled="loading"
          @change="changeFilter"
        >
          <option value="">All sessions</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <RequestState
        v-if="loading && !sessions.length"
        state="loading"
        title="Loading sessions…"
      />
      <RequestState
        v-else-if="error"
        state="error"
        title="Could not load sessions"
        :message="error.message"
        retry
        @retry="load"
      />
      <RequestState
        v-else-if="!sessions.length"
        state="empty"
        :title="stateFilter ? 'No matching sessions' : 'No sessions yet'"
        :message="
          stateFilter
            ? 'Try another filter.'
            : 'Schedule the first session of this class.'
        "
      />
      <section v-else :aria-busy="loading" aria-label="Class sessions">
        <p
          v-if="highlightMissing"
          class="ot-notice mb-3"
          role="status"
          data-test="highlight-missing"
        >
          The overlapping session is not on this page. Use the page buttons or
          the filter to find it.
        </p>
        <ul class="list-unstyled d-grid gap-3 mb-0">
          <li v-for="session in sessions" :key="session.id">
            <article
              :id="sessionAnchor(session.id)"
              class="ot-card"
              :class="{ 'session-highlight': session.id === highlightId }"
              tabindex="-1"
              data-test="session"
            >
              <p
                v-if="session.id === highlightId"
                class="ot-status ot-status--late mb-3"
                data-test="highlight-note"
              >
                Overlaps the session you were scheduling
              </p>
              <div
                class="d-flex flex-wrap align-items-start justify-content-between gap-3"
              >
                <div>
                  <h2 class="ot-section-title mb-1">
                    {{ windowOf(session).date }}
                  </h2>
                  <p class="mb-1">
                    {{ windowOf(session).time }} · Late after
                    {{ formatTime(session.late_after) }}
                  </p>
                  <p class="ot-meta mb-2">
                    {{ session.room_label }} · {{ counts(session) }}
                  </p>
                  <p
                    class="ot-meta mb-0 d-flex flex-wrap align-items-center gap-2"
                  >
                    <span data-test="saved-state"
                      >Saved state:
                      {{
                        session.state === 'cancelled'
                          ? 'Cancelled'
                          : 'Scheduled'
                      }}</span
                    >
                    <AvailabilityBadge :availability="session.availability" />
                  </p>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <RouterLink
                    v-if="
                      canCancel(session) && session.availability === 'upcoming'
                    "
                    class="btn btn-outline-primary"
                    :to="{
                      name: 'admin-class-attendance-settings',
                      params: { classId },
                      query: { sessionId: session.id },
                    }"
                    >Attendance settings</RouterLink
                  >
                  <button
                    v-if="canCancel(session)"
                    type="button"
                    class="btn btn-outline-danger"
                    :disabled="cancelling"
                    :aria-label="`Cancel the session on ${windowOf(session).date}, ${windowOf(session).time}`"
                    @click="askCancel(session)"
                  >
                    Cancel session
                  </button>
                </div>
              </div>
            </article>
          </li>
        </ul>
        <ClassPagination
          :meta="meta"
          :disabled="loading"
          noun="session"
          plural-noun="sessions"
          label="Session pages"
          @change="setPage"
        />
      </section>
    </template>

    <ConfirmDialog
      :open="confirming !== null"
      :busy="cancelling"
      :error="cancelError"
      title="Cancel this session?"
      :message="cancelMessage"
      confirm-label="Cancel session"
      @confirm="confirmCancel"
      @cancel="confirming = null"
    />
  </div>
</template>

<style scoped>
.session-highlight {
  border-color: var(--ot-warning);
  box-shadow: 0 0 0 3px var(--ot-warning);
  background: var(--ot-warning-bg);
}
</style>
