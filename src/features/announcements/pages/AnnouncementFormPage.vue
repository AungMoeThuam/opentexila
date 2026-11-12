<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import FormField from '../../courses/components/FormField.vue';
import { formErrorsFrom } from '../../courses/services/form-errors.js';
import { myClassesService } from '../../enrolments/services/index.js';
import { useClassOptions } from '../composables/use-class-options.js';
import {
  CATEGORIES,
  ROLE_ROUTES,
  classLabel,
} from '../services/announcement-options.js';
import {
  MAX_BODY,
  MAX_TITLE,
  changedAnnouncementFields,
  charactersLeft,
  validateAnnouncementForm,
} from '../services/announcement-validation.js';
import { announcementWriteService as service } from '../services/write-index.js';

const route = useRoute();
const router = useRouter();
const names = ROLE_ROUTES.lecturer;
const editing = computed(() => route.name === names.edit);

const form = reactive({
  class_id: '',
  category: 'general',
  title: '',
  body: '',
});
const original = ref(null);
const errors = ref({});
const notice = ref(null); // { tone: 'error' | 'info', text }
const saving = ref(false);
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const confirmingDelete = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const formElement = ref();
let controller;
let active = true;

const classes = useClassOptions({
  list: (params, config) => myClassesService.list(params, config),
});

const left = computed(() => charactersLeft(form.body));
const counter = computed(() =>
  left.value >= 0
    ? `${left.value} characters left`
    : `${-left.value} characters too many`,
);
// Saving waits for the class list in create mode, so a post never goes to a
// class the lecturer did not choose.
const classesReady = computed(
  () => editing.value || (!classes.loading.value && !classes.error.value),
);
const busy = computed(() => saving.value || deleting.value);

const feedTo = (classId) => ({
  name: names.feed,
  ...(classId ? { query: { classId: String(classId) } } : {}),
});

function startCreate() {
  const wanted = String(route.query.classId ?? '');
  // An unknown or foreign class in the address is ignored.
  form.class_id = classes.options.value.some((item) => item.value === wanted)
    ? wanted
    : '';
}

async function loadClasses() {
  await classes.load();
  if (!active) return;
  startCreate();
}

async function loadPost() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  try {
    const post = await service.get(route.params.announcementId, { signal });
    if (signal.aborted) return;
    original.value = post;
    form.category = post.category;
    form.title = post.title;
    form.body = post.body;
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (cause?.status === 404) notFound.value = true;
    else if (cause?.status === 403) router.replace({ name: 'forbidden' });
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
  if (busy.value || !classesReady.value) return;
  const check = validateAnnouncementForm(form, {
    requireClass: !editing.value,
  });
  errors.value = check.errors;
  notice.value = null;
  if (!check.valid) {
    notice.value = {
      tone: 'error',
      text: 'Please correct the highlighted fields.',
    };
    return focusFirstError();
  }
  const changes = editing.value
    ? changedAnnouncementFields(check.payload, original.value)
    : null;
  if (editing.value && !Object.keys(changes).length) {
    notice.value = { tone: 'info', text: 'There are no changes to save.' };
    return;
  }
  saving.value = true;
  try {
    let saved;
    if (editing.value) {
      saved = await service.update(route.params.announcementId, changes);
    } else {
      const { class_id: classId, ...body } = check.payload;
      saved = await service.create(classId, body);
    }
    if (!active) return;
    notify(
      editing.value ? 'Announcement updated.' : 'Announcement posted.',
      'success',
    );
    router.push(feedTo(editing.value ? null : saved.class_id));
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN')
      return router.replace({ name: 'forbidden' });
    if (cause?.status === 404) {
      notFound.value = true;
      return;
    }
    // The typed text stays, so the lecturer can try again.
    const mapped = formErrorsFrom(cause);
    errors.value = mapped.fields;
    notice.value = { tone: 'error', text: mapped.message };
    focusFirstError();
  } finally {
    saving.value = false;
  }
}

function askDelete() {
  if (busy.value) return;
  deleteError.value = '';
  confirmingDelete.value = true;
}

async function confirmDelete() {
  if (deleting.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await service.remove(route.params.announcementId);
    if (!active) return;
    confirmingDelete.value = false;
    notify('Announcement deleted.', 'success');
    router.push(feedTo(null));
  } catch (cause) {
    if (!active) return;
    if (cause?.status === 403 && cause.code === 'FORBIDDEN') {
      confirmingDelete.value = false;
      return router.replace({ name: 'forbidden' });
    }
    if (cause?.status === 404) {
      confirmingDelete.value = false;
      notFound.value = true;
      return;
    }
    deleteError.value =
      cause?.message || 'The announcement could not be deleted.';
  } finally {
    deleting.value = false;
  }
}

watch(
  () => [route.name, route.params.announcementId],
  () => {
    errors.value = {};
    notice.value = null;
    original.value = null;
    notFound.value = false;
    confirmingDelete.value = false;
    Object.assign(form, {
      class_id: '',
      category: 'general',
      title: '',
      body: '',
    });
    if (editing.value) loadPost();
    else loadClasses();
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
    <RouterLink
      class="d-inline-block mb-4"
      :to="feedTo(editing ? original?.class_id : route.query.classId)"
      >← All announcements</RouterLink
    >
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Lecturer · Announcements</p>
        <h1 class="ot-page-title">
          {{ editing ? 'Edit announcement' : 'New announcement' }}
        </h1>
        <p class="ot-subtitle">
          {{
            editing
              ? 'Students of the class see the change straight away.'
              : 'Post news to one of your classes. Students of the class can read, like and comment.'
          }}
        </p>
      </div>
    </header>

    <div v-if="notFound" class="ot-card ot-empty">
      <h2 class="ot-section-title">Announcement not found</h2>
      <p class="ot-meta">This announcement or class was not found.</p>
      <RouterLink class="btn btn-outline-primary" :to="feedTo(null)"
        >Back to announcements</RouterLink
      >
    </div>
    <RequestState
      v-else-if="editing && loading"
      state="loading"
      title="Loading announcement…"
    />
    <RequestState
      v-else-if="editing && loadError"
      state="error"
      title="Could not load announcement"
      message="The server is not available. Please retry."
      retry
      @retry="loadPost"
    />
    <RequestState
      v-else-if="!editing && classes.loading.value"
      state="loading"
      title="Loading your classes…"
    />
    <RequestState
      v-else-if="!editing && classes.error.value"
      state="error"
      title="Could not load your classes"
      message="You need a class to post to. Please retry."
      retry
      @retry="loadClasses"
    />
    <div
      v-else-if="!editing && !classes.options.value.length"
      class="ot-card ot-empty"
    >
      <h2 class="ot-section-title">No classes to post to</h2>
      <p class="ot-meta">
        You can post only to classes you teach, and none are assigned to you
        yet.
      </p>
    </div>
    <form
      v-else
      ref="formElement"
      class="ot-card"
      novalidate
      :aria-busy="busy"
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
        <div class="col-12 col-md-8">
          <FormField
            v-if="!editing"
            id="announcement-class"
            label="Class"
            required
            :error="errors.class_id"
          >
            <template #default="field">
              <select
                :id="field.id"
                v-model="form.class_id"
                class="form-select"
                :class="{ 'is-invalid': field.invalid }"
                required
                :disabled="busy"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              >
                <option value="">Select a class</option>
                <option
                  v-for="item in classes.options.value"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </template>
          </FormField>
          <div v-else>
            <span class="form-label d-block">Class</span>
            <p class="mb-0" data-test="class-text">
              {{ classLabel(original?.class) }}
            </p>
            <div class="form-text">The class of a post cannot change.</div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <FormField
            id="announcement-category"
            label="Category"
            required
            :error="errors.category"
          >
            <template #default="field">
              <select
                :id="field.id"
                v-model="form.category"
                class="form-select"
                :class="{ 'is-invalid': field.invalid }"
                required
                :disabled="busy"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              >
                <option
                  v-for="item in CATEGORIES"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </template>
          </FormField>
        </div>
        <div class="col-12">
          <FormField
            id="announcement-title"
            label="Title"
            required
            :error="errors.title"
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="form.title"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="text"
                autocomplete="off"
                required
                :disabled="busy"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              />
            </template>
          </FormField>
          <div class="form-text">Up to {{ MAX_TITLE }} characters.</div>
        </div>
        <div class="col-12">
          <FormField
            id="announcement-body"
            label="Body"
            required
            :error="errors.body"
            :hint="counter"
          >
            <template #default="field">
              <textarea
                :id="field.id"
                v-model="form.body"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                rows="8"
                required
                :disabled="busy"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              ></textarea>
            </template>
          </FormField>
          <div class="visually-hidden" aria-live="polite">
            {{ left < 0 ? counter : '' }}
          </div>
          <div class="form-text">
            Plain text, up to {{ MAX_BODY }} characters.
          </div>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-4">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="busy || !classesReady"
        >
          <span
            v-if="saving"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          {{
            saving ? 'Saving…' : editing ? 'Save changes' : 'Post announcement'
          }}
        </button>
        <RouterLink
          class="btn btn-outline-primary"
          :class="{ disabled: busy }"
          :aria-disabled="busy"
          :to="feedTo(editing ? original?.class_id : route.query.classId)"
          >Cancel</RouterLink
        >
        <button
          v-if="editing"
          type="button"
          class="btn btn-outline-danger ms-md-auto"
          :disabled="busy"
          @click="askDelete"
        >
          Delete announcement
        </button>
      </div>
    </form>

    <ConfirmDialog
      :open="confirmingDelete"
      :busy="deleting"
      :error="deleteError"
      title="Delete this announcement?"
      message="This also deletes its likes and comments. This cannot be undone."
      confirm-label="Delete announcement"
      @confirm="confirmDelete"
      @cancel="confirmingDelete = false"
    />
  </div>
</template>
