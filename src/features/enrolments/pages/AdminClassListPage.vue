<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../components/ClassPagination.vue';
import { adminClassesService } from '../services/index.js';
import { buildAdminClassesPath } from '../services/admin-class-list-query.js';

const router = useRouter();
const filters = reactive({ courseId: '', term: '' });
const applied = ref({});
const classes = ref([]);
const meta = ref(null);
const page = ref(1);
const loading = ref(false);
const error = ref(null);
const validationError = ref('');
let requestController;
let requestVersion = 0;

async function load() {
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const version = ++requestVersion;
  loading.value = true;
  error.value = null;
  try {
    const result = await adminClassesService.list(
      { page: page.value, limit: 20, ...applied.value },
      { signal: controller.signal },
    );
    if (version !== requestVersion) return;
    classes.value = result.data;
    meta.value = result.meta;
  } catch (cause) {
    if (version !== requestVersion || cause?.name === 'AbortError') return;
    error.value = cause;
    classes.value = [];
    meta.value = null;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function applyFilters() {
  try {
    const next = {
      ...(String(filters.courseId).trim()
        ? { courseId: String(filters.courseId).trim() }
        : {}),
      ...(filters.term.trim() ? { term: filters.term.trim() } : {}),
    };
    buildAdminClassesPath({ page: 1, limit: 20, ...next });
    validationError.value = '';
    applied.value = next;
    page.value = 1;
    load();
  } catch (cause) {
    validationError.value = cause.message;
  }
}
function clearFilters() {
  filters.courseId = '';
  filters.term = '';
  validationError.value = '';
  applied.value = {};
  page.value = 1;
  load();
}
function changePage(next) {
  if (loading.value || !meta.value || !Number.isInteger(next)) return;
  if (next < 1 || next > meta.value.totalPages) return;
  page.value = next;
  load();
}
watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(load);
onBeforeUnmount(() => {
  requestVersion++;
  requestController?.abort();
});
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Enrolments</p>
        <h1 class="ot-page-title">Manage class enrolments</h1>
        <p class="ot-subtitle">
          Select a class to review or update its students.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="loading"
        @click="load"
      >
        Refresh
      </button>
    </header>

    <form class="ot-card mb-4" @submit.prevent="applyFilters">
      <div class="row g-3 align-items-end">
        <div class="col-12 col-md-4">
          <label class="form-label" for="admin-course-id">Course ID</label>
          <input
            id="admin-course-id"
            v-model="filters.courseId"
            class="form-control"
            type="text"
            inputmode="numeric"
            placeholder="e.g. 1"
            :aria-invalid="Boolean(validationError)"
          />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label" for="admin-term">Term</label>
          <input
            id="admin-term"
            v-model="filters.term"
            class="form-control"
            type="text"
            maxlength="50"
            placeholder="e.g. 2026-S2"
          />
        </div>
        <div class="col-12 col-md-4 d-flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            Apply filters
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="loading"
            @click="clearFilters"
          >
            Clear
          </button>
        </div>
      </div>
      <p
        v-if="validationError"
        class="ot-notice ot-notice--error mt-3 mb-0"
        role="alert"
      >
        {{ validationError }}
      </p>
    </form>

    <RequestState
      v-if="loading && !classes.length"
      state="loading"
      title="Loading classes…"
    />
    <RequestState
      v-else-if="error"
      state="error"
      title="Could not load classes"
      :message="error.message"
      retry
      @retry="load"
    />
    <RequestState
      v-else-if="!classes.length"
      state="empty"
      title="No classes found"
      message="No classes match these filters."
    />
    <section
      v-else
      :aria-busy="loading"
      aria-label="Classes available to manage"
    >
      <div class="row g-4">
        <div
          v-for="cls in classes"
          :key="cls.id"
          class="col-12 col-md-6 col-xl-4"
        >
          <article class="ot-card h-100 d-flex flex-column">
            <p class="ot-eyebrow">{{ cls.course?.code }}</p>
            <h2 class="ot-section-title">{{ cls.course?.name }}</h2>
            <dl class="row mt-3 mb-4">
              <dt class="col-4">Section</dt>
              <dd class="col-8">{{ cls.section }}</dd>
              <dt class="col-4">Term</dt>
              <dd class="col-8">{{ cls.term }}</dd>
              <dt class="col-4">Lecturer</dt>
              <dd class="col-8">{{ cls.lecturer?.name ?? '—' }}</dd>
              <dt class="col-4">Room</dt>
              <dd class="col-8">{{ cls.room_label || '—' }}</dd>
            </dl>
            <RouterLink
              class="btn btn-outline-primary mt-auto"
              :to="{
                name: 'admin-class-enrolments',
                params: { classId: cls.id },
              }"
              :aria-label="`Manage students in ${cls.course?.code}, section ${cls.section}`"
              >Manage students</RouterLink
            >
          </article>
        </div>
      </div>
      <ClassPagination
        :meta="meta"
        :disabled="loading"
        label="Admin classes pages"
        @change="changePage"
      />
    </section>
  </div>
</template>
