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
import FormField from '../components/FormField.vue';
import ScheduleConflictList from '../components/ScheduleConflictList.vue';
import { useSessionConflicts } from '../composables/use-session-conflicts.js';
import {
  DEFAULT_LATE_MINUTES,
  DEFAULT_LENGTH_MINUTES,
  sessionSummary,
  validateSessionForm,
} from '../services/class-session-validation.js';
import { formErrorsFrom } from '../services/form-errors.js';
import {
  classManagementService,
  classSessionsService,
  timetableService,
} from '../services/index.js';
import {
  ADMIN_TIME_ZONE_LABEL,
  addMinutesToInput,
  zonedInputToDate,
} from '../services/zoned-time.js';

const route = useRoute();
const router = useRouter();
const classId = computed(() => route.params.classId);
const listTo = computed(() => ({
  name: 'admin-class-schedule',
  params: { classId: classId.value },
}));

const form = reactive({ starts_at: '', late_after: '', ends_at: '' });
// Late and end times follow the start time until the admin changes them.
const touched = reactive({ late_after: false, ends_at: false });
const errors = ref({});
const notice = ref(null); // { tone: 'error' | 'info', text }
const saving = ref(false);
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const classInfo = ref(null);
const formElement = ref();
let controller;
let active = true;

const summary = computed(() => sessionSummary(form));

// Sessions that clash with the times typed so far. The warning is advice; the
// server decides when the session is saved and can send its own list.
const live = useSessionConflicts({
  service: timetableService,
  target: () => ({
    classId: classInfo.value?.id,
    lecturerId: classInfo.value?.lecturer?.id,
    room: classInfo.value?.room_label,
  }),
  times: () => ({
    start: zonedInputToDate(form.starts_at),
    end: zonedInputToDate(form.ends_at),
  }),
});
const serverConflicts = ref([]);
const shownConflicts = computed(() =>
  serverConflicts.value.length ? serverConflicts.value : live.conflicts.value,
);
// A new time makes an old server answer out of date.
watch(
  () => [form.starts_at, form.late_after, form.ends_at],
  () => {
    serverConflicts.value = [];
  },
);
const classTitle = computed(() =>
  classInfo.value
    ? `${classInfo.value.course?.code} · Section ${classInfo.value.section} · ${classInfo.value.term}`
    : '',
);

async function loadClass() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const loaded = await classManagementService.get(classId.value, { signal });
    if (signal.aborted) return;
    classInfo.value = loaded;
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (cause?.status === 404) notFound.value = true;
    else if (cause?.status === 403) router.replace({ name: 'forbidden' });
    else loadError.value = cause;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

// Fills the late and end times from the start time, unless the admin set them.
function startChanged() {
  if (!touched.late_after)
    form.late_after = addMinutesToInput(form.starts_at, DEFAULT_LATE_MINUTES);
  if (!touched.ends_at)
    form.ends_at = addMinutesToInput(form.starts_at, DEFAULT_LENGTH_MINUTES);
}

async function focusFirstError() {
  await nextTick();
  formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
}

async function save() {
  if (saving.value) return;
  const check = validateSessionForm(form);
  errors.value = check.errors;
  notice.value = null;
  if (!check.valid) {
    notice.value = {
      tone: 'error',
      text: 'Please correct the highlighted fields.',
    };
    return focusFirstError();
  }
  saving.value = true;
  serverConflicts.value = [];
  try {
    await classSessionsService.create(classId.value, check.payload);
    if (!active) return;
    notify('Session scheduled.', 'success');
    router.push(listTo.value);
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN')
      return router.replace({ name: 'forbidden' });
    if (cause?.status === 404) {
      notFound.value = true;
      return;
    }
    // The typed times stay, so the admin can change one and try again.
    const mapped = formErrorsFrom(cause);
    errors.value = mapped.fields;
    notice.value = { tone: 'error', text: mapped.message };
    serverConflicts.value = cause?.conflicts ?? [];
    focusFirstError();
  } finally {
    saving.value = false;
  }
}

onMounted(loadClass);
onBeforeUnmount(() => {
  active = false;
  controller?.abort();
});
</script>

<template>
  <div class="ot-page-content">
    <RouterLink class="d-inline-block mb-4" :to="listTo"
      >← Class schedule</RouterLink
    >
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Classes</p>
        <h1 class="ot-page-title">Schedule a session</h1>
        <p v-if="classTitle" class="ot-subtitle">{{ classTitle }}</p>
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
    <RequestState v-else-if="loading" state="loading" title="Loading class…" />
    <RequestState
      v-else-if="loadError"
      state="error"
      title="Could not load the class"
      :message="loadError.message"
      retry
      @retry="loadClass"
    />
    <form
      v-else
      ref="formElement"
      class="ot-card"
      novalidate
      :aria-busy="saving"
      @submit.prevent="save"
    >
      <p
        v-if="notice"
        class="ot-notice mb-4"
        :class="{ 'ot-notice--error': notice.tone === 'error' }"
        :role="notice.tone === 'error' ? 'alert' : 'status'"
      >
        {{ notice.text }}
      </p>
      <p class="ot-meta">
        Type the times in {{ ADMIN_TIME_ZONE_LABEL }}. They are saved as UTC.
        The session uses the venue of the class
        <template v-if="classInfo"
          >({{ classInfo.room_label }}, {{ classInfo.radius_m }} m
          radius)</template
        >
        as it is now.
      </p>
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <FormField
            id="session-starts-at"
            label="Start time"
            required
            :error="errors.starts_at"
            hint="Students can check in from this time."
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.starts_at"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="datetime-local"
                required
                :disabled="saving"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
                @change="startChanged"
              />
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-4">
          <FormField
            id="session-late-after"
            label="Late after"
            required
            :error="errors.late_after"
            hint="A check-in up to this time is Present."
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.late_after"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="datetime-local"
                required
                :disabled="saving"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
                @input="touched.late_after = true"
              />
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-4">
          <FormField
            id="session-ends-at"
            label="End time"
            required
            :error="errors.ends_at"
            hint="Check-in closes at this time."
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.ends_at"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="datetime-local"
                required
                :disabled="saving"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
                @input="touched.ends_at = true"
              />
            </template>
          </FormField>
        </div>
      </div>
      <p
        v-if="summary"
        class="ot-notice mt-4 mb-0"
        role="status"
        data-test="summary"
      >
        {{ summary }}
      </p>
      <div
        v-if="shownConflicts.length"
        class="ot-notice ot-notice--warning mt-4 mb-0"
        role="status"
        data-test="conflicts"
      >
        <p class="fw-semibold mb-2">
          {{
            serverConflicts.length
              ? 'The server did not accept this time because it overlaps:'
              : 'This time overlaps another scheduled session:'
          }}
        </p>
        <ScheduleConflictList :conflicts="shownConflicts" />
        <p v-if="!serverConflicts.length" class="ot-meta mt-2 mb-0">
          You can change the times, or try to save and the server will decide.
        </p>
      </div>
      <p
        v-else-if="live.error.value"
        class="ot-meta mt-3 mb-0"
        data-test="conflict-check-failed"
      >
        The overlap check could not run. The server checks again when you save.
      </p>
      <div class="d-flex flex-wrap gap-2 mt-4">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span
            v-if="saving"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          {{ saving ? 'Scheduling…' : 'Schedule session' }}
        </button>
        <RouterLink
          class="btn btn-outline-primary"
          :class="{ disabled: saving }"
          :aria-disabled="saving"
          :to="listTo"
          >Cancel</RouterLink
        >
      </div>
    </form>
  </div>
</template>
