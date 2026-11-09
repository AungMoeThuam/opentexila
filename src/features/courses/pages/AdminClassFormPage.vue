<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import FormField from '../components/FormField.vue';
import {
  classManagementService,
  coursesService,
  lecturersService,
} from '../services/index.js';
import { listAll } from '../services/course-class-services.js';
import {
  MAX_RADIUS_M,
  MIN_RADIUS_M,
  changedFields,
  classFormValues,
  validateClassForm,
} from '../services/course-class-validation.js';
import { formErrorsFrom } from '../services/form-errors.js';

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'admin-class-edit');
const form = reactive(classFormValues(null));
const original = ref(null);
const courses = ref([]);
const lecturers = ref([]);
const errors = ref({});
const notice = ref(null); // { tone: 'error' | 'info', text }
const saving = ref(false);
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const formElement = ref();
let controller;
let active = true;

// Course, term and section are frozen by the backend once sessions exist.
const identityLocked = computed(
  () => editing.value && Boolean(original.value?.has_class_sessions),
);
const title = computed(() =>
  editing.value && original.value
    ? `${original.value.course.code} · Section ${original.value.section} · ${original.value.term}`
    : '',
);
// The assigned lecturer may since have become inactive; keep them visible.
const lecturerOptions = computed(() => {
  const current = original.value?.lecturer;
  if (!current || lecturers.value.some((item) => item.id === current.id))
    return lecturers.value;
  return [
    { id: current.id, name: `${current.name} (inactive, reassign)` },
    ...lecturers.value,
  ];
});

async function loadPage() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const [courseRows, lecturerRows, detail] = await Promise.all([
      listAll((params, options) => coursesService.list(params, options), {
        signal,
      }),
      listAll((params, options) => lecturersService.list(params, options), {
        signal,
      }),
      editing.value
        ? classManagementService.get(route.params.classId, { signal })
        : null,
    ]);
    if (signal.aborted) return;
    courses.value = courseRows;
    lecturers.value = lecturerRows;
    original.value = detail;
    Object.assign(form, classFormValues(detail));
    if (!detail) {
      const preset = Number(route.query.courseId);
      if (courseRows.some((course) => course.id === preset))
        form.course_id = preset;
    }
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (cause?.status === 403) router.replace({ name: 'forbidden' });
    if (cause?.status === 404 || cause instanceof RangeError)
      notFound.value = true;
    else loadError.value = cause;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

async function focusFirstError() {
  await nextTick();
  formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
}

async function save() {
  if (saving.value) return;
  const check = validateClassForm(form);
  errors.value = check.errors;
  notice.value = null;
  if (!check.valid) {
    notice.value = {
      tone: 'error',
      text: 'Please correct the highlighted fields.',
    };
    return focusFirstError();
  }
  const body = editing.value
    ? changedFields(check.payload, classFormValues(original.value))
    : check.payload;
  if (editing.value && !Object.keys(body).length) {
    notice.value = { tone: 'info', text: 'There are no changes to save.' };
    return;
  }
  saving.value = true;
  try {
    const saved = editing.value
      ? await classManagementService.update(route.params.classId, body)
      : await classManagementService.create(body);
    if (!active) return;
    notify(
      `${saved.course.code} section ${saved.section} (${saved.term}) ${editing.value ? 'updated' : 'created'}.`,
      'success',
    );
    router.push({
      name: 'admin-classes',
      query: { courseId: saved.course.id },
    });
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN')
      return router.replace({ name: 'forbidden' });
    if (cause?.status === 404) {
      notFound.value = true;
      return;
    }
    const mapped = formErrorsFrom(cause);
    errors.value = mapped.fields;
    notice.value = { tone: 'error', text: mapped.message };
    // Another admin may have scheduled a session meanwhile; refresh the lock.
    if (cause?.code === 'CLASS_HAS_SESSIONS' && original.value)
      original.value = { ...original.value, has_class_sessions: true };
    focusFirstError();
  } finally {
    saving.value = false;
  }
}

watch(
  () => [route.name, route.params.classId],
  () => {
    errors.value = {};
    notice.value = null;
    original.value = null;
    Object.assign(form, classFormValues(null));
    loadPage();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  active = false;
  controller?.abort();
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
        <h1 class="ot-page-title">
          {{ editing ? 'Edit class' : 'New class' }}
        </h1>
        <p v-if="title" class="ot-subtitle">{{ title }}</p>
      </div>
      <div v-if="editing && original" class="d-flex flex-wrap gap-2">
        <RouterLink
          class="btn btn-outline-primary"
          :to="{
            name: 'admin-class-enrolments',
            params: { classId: original.id },
          }"
          >Students</RouterLink
        >
        <RouterLink
          class="btn btn-outline-primary"
          :to="{
            name: 'admin-class-schedule',
            params: { classId: original.id },
          }"
          >Schedule</RouterLink
        >
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
      :title="editing ? 'Loading class…' : 'Loading courses and lecturers…'"
    />
    <RequestState
      v-else-if="loadError"
      state="error"
      title="Could not load the form"
      :message="loadError.message"
      retry
      @retry="loadPage"
    />
    <form
      v-else
      ref="formElement"
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

      <fieldset class="ot-card mb-4">
        <legend class="ot-section-title">Offering</legend>
        <p v-if="identityLocked" class="ot-notice mb-3">
          Class sessions have been scheduled, so course, term and section can no
          longer change. To fix them, create a new class.
        </p>
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <FormField
              id="class-course"
              label="Course"
              required
              :error="errors.course_id"
            >
              <template #default="field">
                <select
                  :id="field.id"
                  v-model="form.course_id"
                  class="form-select"
                  :class="{ 'is-invalid': field.invalid }"
                  required
                  :disabled="saving || identityLocked"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                >
                  <option value="" disabled>Select a course</option>
                  <option
                    v-for="course in courses"
                    :key="course.id"
                    :value="course.id"
                  >
                    {{ course.code }} · {{ course.name }}
                  </option>
                </select>
              </template>
            </FormField>
            <p v-if="!courses.length" class="form-text">
              No courses yet.
              <RouterLink :to="{ name: 'admin-course-new' }"
                >Create a course</RouterLink
              >
              first.
            </p>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <FormField
              id="class-term"
              label="Term"
              required
              :error="errors.term"
              hint="e.g. 2026-S2"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.term"
                  class="form-control"
                  :class="{ 'is-invalid': field.invalid }"
                  type="text"
                  maxlength="50"
                  autocomplete="off"
                  required
                  :disabled="saving || identityLocked"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <FormField
              id="class-section"
              label="Section"
              required
              :error="errors.section"
              hint="e.g. A or LAB1"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.section"
                  class="form-control text-uppercase"
                  :class="{ 'is-invalid': field.invalid }"
                  type="text"
                  maxlength="30"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  required
                  :disabled="saving || identityLocked"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
          <div class="col-12 col-lg-6">
            <FormField
              id="class-lecturer"
              label="Lecturer"
              required
              :error="errors.lecturer_id"
              :hint="
                editing && original?.has_class_sessions
                  ? 'A new lecturer gets access to this class immediately.'
                  : ''
              "
            >
              <template #default="field">
                <select
                  :id="field.id"
                  v-model="form.lecturer_id"
                  class="form-select"
                  :class="{ 'is-invalid': field.invalid }"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                >
                  <option value="" disabled>Select a lecturer</option>
                  <option
                    v-for="lecturer in lecturerOptions"
                    :key="lecturer.id"
                    :value="lecturer.id"
                  >
                    {{ lecturer.name
                    }}{{ lecturer.email ? ` · ${lecturer.email}` : '' }}
                  </option>
                </select>
              </template>
            </FormField>
            <p v-if="!lecturers.length" class="form-text text-danger">
              There are no active lecturer accounts to assign.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset class="ot-card mb-4">
        <legend class="ot-section-title">Attendance location</legend>
        <p class="ot-meta">
          Students must be within the radius of these coordinates to check in.
          <template v-if="editing && original?.has_class_sessions">
            Changes apply to class sessions scheduled after you save; existing
            sessions keep their current location.
          </template>
        </p>
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <FormField
              id="class-room"
              label="Room"
              required
              :error="errors.room_label"
              hint="e.g. EN402"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.room_label"
                  class="form-control"
                  :class="{ 'is-invalid': field.invalid }"
                  type="text"
                  maxlength="100"
                  autocomplete="off"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
          <div class="col-12 col-lg-6">
            <FormField
              id="class-radius"
              label="Attendance radius (metres)"
              required
              :error="errors.radius_m"
              :hint="`${MIN_RADIUS_M} to ${MAX_RADIUS_M} metres.`"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.radius_m"
                  class="form-control"
                  :class="{ 'is-invalid': field.invalid }"
                  type="number"
                  inputmode="decimal"
                  :min="MIN_RADIUS_M"
                  :max="MAX_RADIUS_M"
                  step="any"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
          <div class="col-12 col-sm-6">
            <FormField
              id="class-latitude"
              label="Latitude"
              required
              :error="errors.latitude"
              hint="-90 to 90, e.g. -37.8221"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.latitude"
                  class="form-control"
                  :class="{ 'is-invalid': field.invalid }"
                  type="number"
                  inputmode="decimal"
                  min="-90"
                  max="90"
                  step="any"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
          <div class="col-12 col-sm-6">
            <FormField
              id="class-longitude"
              label="Longitude"
              required
              :error="errors.longitude"
              hint="-180 to 180, e.g. 145.0389"
            >
              <template #default="field">
                <input
                  :id="field.id"
                  v-model="form.longitude"
                  class="form-control"
                  :class="{ 'is-invalid': field.invalid }"
                  type="number"
                  inputmode="decimal"
                  min="-180"
                  max="180"
                  step="any"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                />
              </template>
            </FormField>
          </div>
        </div>
      </fieldset>

      <div class="d-flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span
            v-if="saving"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create class' }}
        </button>
        <RouterLink
          class="btn btn-outline-primary"
          :class="{ disabled: saving }"
          :aria-disabled="saving"
          :to="{ name: 'admin-classes' }"
          >Cancel</RouterLink
        >
      </div>
    </form>
  </div>
</template>

<style scoped>
legend.ot-section-title {
  float: none;
  width: auto;
}
</style>
