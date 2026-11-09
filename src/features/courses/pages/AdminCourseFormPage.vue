<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import FormField from '../components/FormField.vue';
import { coursesService } from '../services/index.js';
import { listAll } from '../services/course-class-services.js';
import {
  changedFields,
  validateCourseForm,
} from '../services/course-class-validation.js';
import { formErrorsFrom } from '../services/form-errors.js';

const route = useRoute();
const router = useRouter();
const editing = computed(() => route.name === 'admin-course-edit');
const form = reactive({ code: '', name: '' });
const original = ref(null);
const errors = ref({});
const notice = ref(null); // { tone: 'error' | 'info', text }
const saving = ref(false);
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const formElement = ref();
let controller;
let active = true;

// There is no single-course endpoint; find the course in the full list.
async function loadCourse() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const id = Number(route.params.courseId);
    const courses = await listAll(
      (params, options) => coursesService.list(params, options),
      { signal },
    );
    if (signal.aborted) return;
    const course = courses.find((item) => item.id === id);
    if (!course) {
      notFound.value = true;
      return;
    }
    original.value = course;
    form.code = course.code;
    form.name = course.name;
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (cause?.status === 403) router.replace({ name: 'forbidden' });
    loadError.value = cause;
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
  const check = validateCourseForm(form);
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
    ? changedFields(check.payload, original.value)
    : check.payload;
  if (editing.value && !Object.keys(body).length) {
    notice.value = { tone: 'info', text: 'There are no changes to save.' };
    return;
  }
  saving.value = true;
  try {
    const saved = editing.value
      ? await coursesService.update(route.params.courseId, body)
      : await coursesService.create(body);
    if (!active) return;
    notify(
      `Course ${saved.code} ${editing.value ? 'updated' : 'created'}.`,
      'success',
    );
    router.push({ name: 'admin-courses' });
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
    focusFirstError();
  } finally {
    saving.value = false;
  }
}

watch(
  () => [route.name, route.params.courseId],
  () => {
    errors.value = {};
    notice.value = null;
    original.value = null;
    form.code = '';
    form.name = '';
    if (editing.value) loadCourse();
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
    <RouterLink class="d-inline-block mb-4" :to="{ name: 'admin-courses' }"
      >← All courses</RouterLink
    >
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Courses</p>
        <h1 class="ot-page-title">
          {{ editing ? 'Edit course' : 'New course' }}
        </h1>
        <p v-if="editing" class="ot-subtitle">
          Changes show on every class of this course, including attendance
          history.
        </p>
      </div>
    </header>

    <div v-if="notFound" class="ot-card ot-empty">
      <h2 class="ot-section-title">Course not found</h2>
      <p class="ot-meta">This course does not exist.</p>
      <RouterLink
        class="btn btn-outline-primary"
        :to="{ name: 'admin-courses' }"
        >Back to courses</RouterLink
      >
    </div>
    <RequestState
      v-else-if="editing && loading"
      state="loading"
      title="Loading course…"
    />
    <RequestState
      v-else-if="editing && loadError"
      state="error"
      title="Could not load course"
      :message="loadError.message"
      retry
      @retry="loadCourse"
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
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <FormField
            id="course-code"
            label="Course code"
            required
            :error="errors.code"
            hint="Saved in capitals, e.g. COS30043."
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.code"
                class="form-control text-uppercase"
                :class="{ 'is-invalid': field.invalid }"
                type="text"
                maxlength="30"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                required
                :disabled="saving"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              />
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-8">
          <FormField
            id="course-name"
            label="Course name"
            required
            :error="errors.name"
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.name"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="text"
                maxlength="150"
                autocomplete="off"
                required
                :disabled="saving"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              />
            </template>
          </FormField>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-4">
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span
            v-if="saving"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create course' }}
        </button>
        <RouterLink
          class="btn btn-outline-primary"
          :class="{ disabled: saving }"
          :aria-disabled="saving"
          :to="{ name: 'admin-courses' }"
          >Cancel</RouterLink
        >
      </div>
    </form>
  </div>
</template>
