<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import AttendancePolicyForm from '../components/AttendancePolicyForm.vue';
import AttendancePolicyPreview from '../components/AttendancePolicyPreview.vue';
import CheckInSimulator from '../components/CheckInSimulator.vue';
import {
  changedPolicyFields,
  differsFromClass,
  isEditable,
  maxLateMinutes,
  policyFormValues,
  policySummary,
  sessionOptionLabel,
  validatePolicy,
} from '../services/attendance-policy.js';
import { formErrorsFrom } from '../services/form-errors.js';
import {
  classManagementService,
  classSessionsService,
} from '../services/index.js';
import {
  followProbe,
  pointAtDistance,
} from '../services/check-in-simulation.js';
import { samePosition, toPosition, toRadius } from '../services/geofence.js';
import { ADMIN_TIME_ZONE_LABEL } from '../services/zoned-time.js';

const MAX_PAGES = 20;

const route = useRoute();
const router = useRouter();
const classId = computed(() => route.params.classId);

const classInfo = ref(null);
const sessions = ref([]); // upcoming, scheduled sessions of the class
const selectedId = ref('');
const values = reactive(policyFormValues(null));
// The test student of the check-in simulator. Not saved anywhere.
const probe = ref(null);
const errors = ref({});
const notice = ref(null); // { tone: 'error' | 'info', text }
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const saving = ref(false);
const formElement = ref();
let controller;
let active = true;

const selected = computed(
  () =>
    sessions.value.find((item) => String(item.id) === selectedId.value) ?? null,
);
const summary = computed(() => policySummary(values, selected.value));
const maxLate = computed(() =>
  selected.value ? maxLateMinutes(selected.value) : 0,
);
// What would be sent: only the fields that differ from the saved session.
const changes = computed(() => {
  if (!selected.value) return {};
  const check = validatePolicy(values, selected.value);
  return check.valid
    ? changedPolicyFields(check.payload, selected.value)
    : { invalid: true };
});
const unsaved = computed(() => Object.keys(changes.value).length > 0);
const differsFromClassDefaults = computed(() =>
  differsFromClass(values, classInfo.value),
);
const classTitle = computed(() =>
  classInfo.value
    ? `${classInfo.value.course?.code} · Section ${classInfo.value.section} · ${classInfo.value.term}`
    : '',
);

async function loadPage() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const detail = await classManagementService.get(classId.value, { signal });
    const upcoming = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await classSessionsService.list(
        classId.value,
        { page, limit: 100, state: 'scheduled' },
        { signal },
      );
      upcoming.push(...result.data.filter(isEditable));
      if (page >= result.meta.totalPages) break;
    }
    if (signal.aborted) return;
    classInfo.value = detail;
    sessions.value = upcoming;
    const wanted = String(route.query.sessionId ?? '');
    choose(
      upcoming.some((item) => String(item.id) === wanted)
        ? wanted
        : String(upcoming[0]?.id ?? ''),
    );
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (cause?.status === 403) router.replace({ name: 'forbidden' });
    else if (cause?.status === 404 || cause instanceof RangeError)
      notFound.value = true;
    else loadError.value = cause;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

// Shows one session's saved values in the form.
function choose(id) {
  selectedId.value = id;
  errors.value = {};
  notice.value = null;
  Object.assign(values, policyFormValues(selected.value));
  placeProbe();
}

// The test student starts inside the area, half way to the edge.
function placeProbe() {
  const center = toPosition(values.latitude, values.longitude);
  const radius = toRadius(values.radius_m);
  probe.value =
    center && radius !== null ? pointAtDistance(center, radius / 2) : null;
  lastCenter = center;
}

// The test student moves with the classroom pin and keeps its distance and
// direction from it, whether the pin was dragged, the map was clicked, the
// device location was used or the coordinates were typed. `lastCenter` is the
// last usable pin position, so a half-typed coordinate does not lose track.
let lastCenter = null;
watch(
  () => [values.latitude, values.longitude],
  () => {
    const next = toPosition(values.latitude, values.longitude);
    if (!next) return;
    if (lastCenter && !samePosition(lastCenter, next))
      probe.value = followProbe({
        previous: lastCenter,
        next,
        probe: probe.value,
      });
    lastCenter = next;
  },
);

function pickSession() {
  router.replace({
    query: selectedId.value ? { sessionId: selectedId.value } : {},
  });
  choose(selectedId.value);
}

function update({ field, value }) {
  values[field] = value;
  if (errors.value[field])
    errors.value = { ...errors.value, [field]: undefined };
}

function resetToSaved() {
  errors.value = {};
  notice.value = null;
  Object.assign(values, policyFormValues(selected.value));
}

// Puts the class's own room, location and radius into the form (the late
// allowance is not a class setting, so it stays).
function useClassDefaults() {
  if (!classInfo.value) return;
  Object.assign(values, {
    room_label: classInfo.value.room_label,
    latitude: Number(classInfo.value.latitude),
    longitude: Number(classInfo.value.longitude),
    radius_m: Number(classInfo.value.radius_m),
  });
  errors.value = {};
}

async function focusFirstError() {
  await nextTick();
  formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
}

async function save() {
  if (saving.value || !selected.value) return;
  const check = validatePolicy(values, selected.value);
  errors.value = check.errors;
  notice.value = null;
  if (!check.valid) {
    notice.value = {
      tone: 'error',
      text: 'Please correct the highlighted fields.',
    };
    return focusFirstError();
  }
  const body = changedPolicyFields(check.payload, selected.value);
  if (!Object.keys(body).length) {
    notice.value = { tone: 'info', text: 'There are no changes to save.' };
    return;
  }
  saving.value = true;
  try {
    const saved = await classSessionsService.updatePolicy(
      selected.value.id,
      body,
    );
    if (!active) return;
    sessions.value = sessions.value.map((item) =>
      item.id === saved.id ? saved : item,
    );
    Object.assign(values, policyFormValues(saved));
    notify('Attendance settings saved for this session.', 'success');
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN')
      return router.replace({ name: 'forbidden' });
    if (cause?.code === 'SESSION_NOT_EDITABLE' || cause?.status === 404) {
      // The session started, ended or was cancelled while the page was open.
      notice.value = {
        tone: 'error',
        text:
          cause.status === 404
            ? 'This session no longer exists.'
            : 'This session has already started, ended or been cancelled, so its settings can no longer be changed.',
      };
      await loadPage();
      return;
    }
    // The typed values stay, so the admin can fix one and try again.
    const mapped = formErrorsFrom(cause);
    const fields = { ...mapped.fields };
    if (fields.late_after) {
      fields.late_minutes = fields.late_after;
      delete fields.late_after;
    }
    errors.value = fields;
    notice.value = { tone: 'error', text: mapped.message };
    focusFirstError();
  } finally {
    saving.value = false;
  }
}

watch(
  () => route.params.classId,
  () => {
    sessions.value = [];
    classInfo.value = null;
    loadPage();
  },
);
onMounted(loadPage);
onBeforeUnmount(() => {
  active = false;
  controller?.abort();
});
</script>

<template>
  <div class="ot-page-content">
    <RouterLink
      class="d-inline-block mb-4"
      :to="{ name: 'admin-class-schedule', params: { classId } }"
      >← Class schedule</RouterLink
    >
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Classes</p>
        <h1 class="ot-page-title">Attendance settings</h1>
        <p v-if="classTitle" class="ot-subtitle">{{ classTitle }}</p>
        <p class="ot-meta mb-0">
          Settings for <strong>one session</strong>. Times are shown in
          {{ ADMIN_TIME_ZONE_LABEL }}.
        </p>
      </div>
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
    <RequestState
      v-else-if="loading"
      state="loading"
      title="Loading sessions…"
    />
    <RequestState
      v-else-if="loadError"
      state="error"
      title="Could not load the class sessions"
      :message="loadError.message"
      retry
      @retry="loadPage"
    />
    <template v-else>
      <p
        v-if="notice && !selected"
        class="ot-notice ot-notice--error mb-4"
        role="alert"
      >
        {{ notice.text }}
      </p>

      <section class="ot-card mb-4" aria-labelledby="class-defaults-title">
        <h2 id="class-defaults-title" class="ot-section-title">
          Class defaults
        </h2>
        <p class="ot-meta mb-2">
          New sessions copy these when they are scheduled. Changing them later
          does not change sessions that already exist.
        </p>
        <p v-if="classInfo" class="mb-2" data-test="class-defaults">
          {{ classInfo.room_label }} · {{ classInfo.radius_m }} m radius
        </p>
        <RouterLink
          class="btn btn-sm btn-outline-primary"
          :to="{ name: 'admin-class-edit', params: { classId } }"
          >Edit class defaults</RouterLink
        >
      </section>

      <RequestState
        v-if="!sessions.length"
        state="empty"
        title="No upcoming sessions"
        message="Only a session that has not started can be changed. Schedule one first."
      />
      <form
        v-else
        ref="formElement"
        class="ot-card"
        novalidate
        :aria-busy="saving"
        @submit.prevent="save"
      >
        <h2 class="ot-section-title">This session only</h2>
        <p
          v-if="notice"
          class="ot-notice mb-4"
          :class="{ 'ot-notice--error': notice.tone === 'error' }"
          :role="notice.tone === 'error' ? 'alert' : 'status'"
        >
          {{ notice.text }}
        </p>
        <div class="mb-4">
          <label class="form-label" for="policy-session">Session</label>
          <select
            id="policy-session"
            v-model="selectedId"
            class="form-select"
            :disabled="saving"
            @change="pickSession"
          >
            <option
              v-for="item in sessions"
              :key="item.id"
              :value="String(item.id)"
            >
              {{ sessionOptionLabel(item) }}
            </option>
          </select>
          <div class="form-text">
            Only sessions that have not started are listed.
          </div>
        </div>

        <AttendancePolicyForm
          :values="values"
          :errors="errors"
          :disabled="saving"
          :max-late="maxLate"
          :probe="probe"
          @probe="probe = $event"
          @update="update"
        >
          <template #aside>
            <AttendancePolicyPreview :summary="summary" />
            <CheckInSimulator
              :session="selected"
              :values="values"
              :probe="probe"
              @update:probe="probe = $event"
            />
          </template>
        </AttendancePolicyForm>

        <p
          v-if="differsFromClassDefaults"
          class="ot-meta mt-2 mb-0"
          data-test="differs-from-class"
        >
          This session differs from the class defaults.
          <button
            type="button"
            class="btn btn-link p-0 align-baseline"
            :disabled="saving"
            @click="useClassDefaults"
          >
            Use the class defaults
          </button>
        </p>

        <div class="d-flex flex-wrap align-items-center gap-2 mt-4">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span
              v-if="saving"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            {{ saving ? 'Saving…' : 'Save for this session' }}
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="saving || !unsaved"
            @click="resetToSaved"
          >
            Reset
          </button>
          <span v-if="unsaved" class="ot-meta" data-test="unsaved">
            You have unsaved changes.
          </span>
        </div>
      </form>
    </template>
  </div>
</template>
