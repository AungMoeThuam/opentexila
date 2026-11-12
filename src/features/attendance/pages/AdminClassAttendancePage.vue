<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import {
  formatSessionWindow,
  formatTime,
} from '../../../shared/utils/format-datetime.js';
import { usePagedList } from '../../courses/composables/use-paged-list.js';
import { listAll } from '../../courses/services/course-class-services.js';
import { classSessionsService } from '../../courses/services/index.js';
import { ADMIN_TIME_ZONE_LABEL } from '../../courses/services/zoned-time.js';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import { adminClassesService } from '../../enrolments/services/index.js';
import AvailabilityBadge from '../components/AvailabilityBadge.vue';
import {
  attendanceLine,
  canViewRoster,
  classIdFromQuery,
  classOptionLabel,
  needsFinalising,
} from '../services/admin-class-attendance.js';

const route = useRoute();
const router = useRouter();
const classId = ref(classIdFromQuery(route.query.classId));
const classes = ref([]);
const classesLoading = ref(false);
const classesError = ref(null);
const context = ref(null);
let classesController;

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
  { limit: 20 },
);

const options = computed(() =>
  classes.value
    .map((item) => ({ value: String(item.id), label: classOptionLabel(item) }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
const notFound = computed(() => error.value?.status === 404);
const windowOf = (session) =>
  formatSessionWindow(session.starts_at, session.ends_at);

async function loadClasses() {
  classesController?.abort();
  classesController = new AbortController();
  classesLoading.value = true;
  classesError.value = null;
  try {
    classes.value = await listAll(
      (params, config) => adminClassesService.list(params, config),
      { signal: classesController.signal },
    );
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    classesError.value = cause;
  } finally {
    classesLoading.value = false;
  }
}

// The chosen class lives in the address, so Back from a roster returns here.
function chooseClass() {
  router.replace({ query: classId.value ? { classId: classId.value } : {} });
  if (classId.value) reload();
  else {
    cancel();
    sessions.value = [];
    meta.value = null;
    context.value = null;
  }
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(() => {
  loadClasses();
  if (classId.value) load();
});
onBeforeUnmount(() => {
  classesController?.abort();
  cancel();
});
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Attendance</p>
        <h1 class="ot-page-title">Class attendance</h1>
        <p class="ot-subtitle">
          Choose a class to see its sessions and who attended. This page is
          read-only.
        </p>
        <p class="ot-meta mb-0">
          Times are shown in {{ ADMIN_TIME_ZONE_LABEL }}.
        </p>
      </div>
    </header>

    <div class="ot-card mb-4">
      <label class="form-label" for="attendance-class">Class</label>
      <select
        id="attendance-class"
        v-model="classId"
        class="form-select"
        :disabled="classesLoading || !options.length"
        aria-describedby="attendance-class-help"
        @change="chooseClass"
      >
        <option value="">
          {{ classesLoading ? 'Loading classes…' : 'Select a class' }}
        </option>
        <option v-for="item in options" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <div id="attendance-class-help" class="form-text">
        <template v-if="classesError"
          >The class list did not load.
          <button type="button" class="btn btn-link p-0" @click="loadClasses">
            Try again
          </button></template
        >
        <template v-else-if="!classesLoading && !options.length"
          >There are no classes yet.</template
        >
        <template v-else>One class at a time.</template>
      </div>
    </div>

    <div v-if="notFound" class="ot-card ot-empty">
      <h2 class="ot-section-title">Class not found</h2>
      <p class="ot-meta">This class does not exist. Choose another one.</p>
    </div>
    <RequestState
      v-else-if="!classId"
      state="empty"
      title="No class selected"
      message="Choose a class above to see its sessions."
    />
    <RequestState
      v-else-if="loading && !sessions.length"
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
      title="No sessions yet"
      message="This class has no scheduled sessions."
    />
    <section v-else :aria-busy="loading" aria-label="Class sessions">
      <h2 v-if="context" class="ot-section-title">
        {{ context.course?.code }} · {{ context.course?.name }}
      </h2>
      <p v-if="context" class="ot-meta">
        Section {{ context.section }} · {{ context.term }} ·
        {{ context.lecturer?.name }}
      </p>
      <ul class="list-unstyled d-grid gap-3 mb-0">
        <li v-for="session in sessions" :key="session.id">
          <article class="ot-card" data-test="session">
            <div
              class="d-flex flex-wrap align-items-start justify-content-between gap-3"
            >
              <div>
                <h3 class="ot-section-title mb-1">
                  {{ windowOf(session).date }}
                </h3>
                <p class="mb-1">
                  {{ windowOf(session).time }} · Late after
                  {{ formatTime(session.late_after) }}
                </p>
                <p
                  class="ot-meta mb-1 d-flex flex-wrap align-items-center gap-2"
                >
                  <AvailabilityBadge :availability="session.availability" />
                  <span data-test="counts">{{
                    attendanceLine(session.attendance)
                  }}</span>
                </p>
                <p
                  v-if="needsFinalising(session)"
                  class="ot-meta mb-0"
                  data-test="not-finalised"
                >
                  The lecturer has not finalised this session, so some students
                  are still pending.
                </p>
              </div>
              <RouterLink
                v-if="canViewRoster(session)"
                class="btn btn-outline-primary"
                :to="{
                  name: 'admin-class-session-records',
                  params: { classSessionId: session.id },
                }"
                :aria-label="`View attendance for ${windowOf(session).date}, ${windowOf(session).time}`"
                >View attendance</RouterLink
              >
              <span v-else class="ot-meta" data-test="not-started"
                >Not started</span
              >
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
  </div>
</template>
