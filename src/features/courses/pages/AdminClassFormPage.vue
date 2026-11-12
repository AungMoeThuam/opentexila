<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import FormField from '../components/FormField.vue';
import GeofencePicker from '../components/GeofencePicker.vue';
import {
  classManagementService,
  coursesService,
  lecturersService,
} from '../services/index.js';
import { listAll } from '../services/course-class-services.js';
import {
  changedFields,
  classFormValues,
  validateClassForm,
} from '../services/course-class-validation.js';
import { formErrorsFrom } from '../services/form-errors.js';
import { adminClassesService } from '../../enrolments/services/index.js';
import {
  canonicalValue,
  distinctValues,
  locationEmpty,
  locationOf,
  nextFreeSection,
  roomSource,
  sameLocationAs,
  sectionTaken,
} from '../services/class-suggestions.js';

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
// Classes that already exist. They only feed the suggestions, so the form works
// without them.
const existing = ref([]);
const roomNote = ref(null); // { text, apply?: location to offer }
let roomRequest = 0;
const roomLocations = new Map(); // class id -> location, to ask once per class
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

const currentId = computed(() => original.value?.id);
const termOptions = computed(() =>
  distinctValues(existing.value, 'term', { excludeId: currentId.value }),
);
const roomOptions = computed(() =>
  distinctValues(existing.value, 'room_label', { excludeId: currentId.value }),
);
const suggestedSection = computed(() =>
  nextFreeSection(existing.value, {
    courseId: form.course_id,
    term: form.term,
    excludeId: currentId.value,
  }),
);
const sectionExists = computed(() =>
  sectionTaken(existing.value, {
    courseId: form.course_id,
    term: form.term,
    section: form.section,
    excludeId: currentId.value,
  }),
);

async function loadPage() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const [courseRows, lecturerRows, detail, classRows] = await Promise.all([
      listAll((params, options) => coursesService.list(params, options), {
        signal,
      }),
      listAll((params, options) => lecturersService.list(params, options), {
        signal,
      }),
      editing.value
        ? classManagementService.get(route.params.classId, { signal })
        : null,
      // Suggestions are optional, so a failure here is ignored.
      listAll((params, options) => adminClassesService.list(params, options), {
        signal,
      }).catch(() => []),
    ]);
    if (signal.aborted) return;
    courses.value = courseRows;
    lecturers.value = lecturerRows;
    existing.value = classRows;
    roomNote.value = null;
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

// Writes a term or room the way an existing class spells it ("2026 s2" becomes
// "2026-S2"), so one term or room is never saved under two spellings.
function tidyTerm() {
  form.term = canonicalValue(form.term, termOptions.value);
}

// A room another class already uses brings that class's location. A new class
// with no location yet starts from it. If a location is already set, the admin
// is asked before it is replaced.
async function roomChanged() {
  form.room_label = canonicalValue(form.room_label, roomOptions.value);
  const source = roomSource(existing.value, form.room_label, {
    excludeId: currentId.value,
  });
  const request = ++roomRequest;
  if (!source) {
    roomNote.value = null;
    return;
  }
  try {
    if (!roomLocations.has(source.id))
      roomLocations.set(
        source.id,
        locationOf(await classManagementService.get(source.id)),
      );
    if (request !== roomRequest || !active) return;
    const location = roomLocations.get(source.id);
    const label = `${source.course?.code} section ${source.section} (${source.term})`;
    if (locationEmpty(form)) {
      Object.assign(form, location);
      roomNote.value = {
        text: `Location copied from ${label}, which also uses ${source.room_label}. Move the pin if this class is in a different spot.`,
      };
    } else if (!sameLocationAs(form, location)) {
      roomNote.value = {
        text: `${label} also uses ${source.room_label}, at a different location.`,
        apply: location,
      };
    } else roomNote.value = null;
  } catch {
    if (request === roomRequest) roomNote.value = null;
  }
}

// Picking a suggestion in the list fires `input` without typing.
function roomInput(event) {
  if (
    event.inputType === undefined ||
    event.inputType === 'insertReplacementText'
  )
    roomChanged();
}

function useRoomLocation() {
  if (!roomNote.value?.apply) return;
  Object.assign(form, roomNote.value.apply);
  roomNote.value = null;
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
        <RouterLink
          class="btn btn-outline-primary"
          :to="{
            name: 'admin-class-attendance-settings',
            params: { classId: original.id },
          }"
          >Attendance settings</RouterLink
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
                  list="class-term-options"
                  required
                  :disabled="saving || identityLocked"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                  @change="tidyTerm"
                />
                <datalist id="class-term-options">
                  <option
                    v-for="option in termOptions"
                    :key="option.value"
                    :value="option.value"
                  ></option>
                </datalist>
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
            <p
              v-if="sectionExists && !identityLocked"
              class="form-text text-danger mb-0"
              data-test="section-taken"
            >
              This course already has this section in this term.
            </p>
            <p
              v-else-if="
                suggestedSection &&
                !identityLocked &&
                form.section !== suggestedSection
              "
              class="form-text mb-0"
              data-test="section-suggestion"
            >
              Next free section:
              <button
                type="button"
                class="btn btn-link p-0 align-baseline"
                @click="form.section = suggestedSection"
              >
                {{ suggestedSection }}
              </button>
            </p>
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
                  list="class-room-options"
                  required
                  :disabled="saving"
                  :aria-invalid="field.invalid"
                  :aria-describedby="field.describedby"
                  @change="roomChanged"
                  @input="roomInput"
                />
                <datalist id="class-room-options">
                  <option
                    v-for="option in roomOptions"
                    :key="option.value"
                    :value="option.value"
                  ></option>
                </datalist>
              </template>
            </FormField>
          </div>
          <div v-if="roomNote" class="col-12">
            <p class="ot-notice mb-0" role="status" data-test="room-note">
              {{ roomNote.text }}
              <button
                v-if="roomNote.apply"
                type="button"
                class="btn btn-sm btn-outline-primary ms-2"
                @click="useRoomLocation"
              >
                Use that location
              </button>
            </p>
          </div>
          <div class="col-12">
            <GeofencePicker
              v-model:latitude="form.latitude"
              v-model:longitude="form.longitude"
              v-model:radius="form.radius_m"
              :errors="errors"
              :disabled="saving"
            />
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
