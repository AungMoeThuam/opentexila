<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import { adminClassesService } from '../../enrolments/services/index.js';
import { usePagedList } from '../composables/use-paged-list.js';
import { listAll } from '../services/course-class-services.js';
import { coursesService } from '../services/index.js';

const route = useRoute();
const router = useRouter();
const initialCourse = /^[1-9]\d*$/.test(String(route.query.courseId ?? ''))
  ? Number(route.query.courseId)
  : '';
const filters = reactive({ courseId: initialCourse, term: '' });
const applied = ref({ ...(initialCourse ? { courseId: initialCourse } : {}) });
const termError = ref('');
const courses = ref([]);
const coursesError = ref('');
let coursesController;

// Reuses GET /classes from the enrolments feature (backend #7).
const {
  rows: classes,
  meta,
  loading,
  error,
  load,
  reload,
  setPage,
  cancel,
} = usePagedList(
  (params, options) => adminClassesService.list(params, options),
  { filters: () => applied.value },
);

async function loadCourses() {
  coursesController = new AbortController();
  coursesError.value = '';
  try {
    courses.value = await listAll(
      (params, options) => coursesService.list(params, options),
      { signal: coursesController.signal },
    );
  } catch (cause) {
    if (cause?.name !== 'AbortError')
      coursesError.value = 'Course filter unavailable: ' + cause.message;
  }
}

function applyFilters() {
  const term = filters.term.trim();
  if (term.length > 50) {
    termError.value = 'Term must be 50 characters or fewer.';
    return;
  }
  termError.value = '';
  applied.value = {
    ...(filters.courseId ? { courseId: Number(filters.courseId) } : {}),
    ...(term ? { term } : {}),
  };
  router.replace({
    query: filters.courseId ? { courseId: filters.courseId } : {},
  });
  reload();
}
function clearFilters() {
  filters.courseId = '';
  filters.term = '';
  termError.value = '';
  applied.value = {};
  router.replace({ query: {} });
  reload();
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(() => {
  load();
  loadCourses();
});
onBeforeUnmount(() => {
  cancel();
  coursesController?.abort();
});
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Classes</p>
        <h1 class="ot-page-title">Classes</h1>
        <p class="ot-subtitle">
          Create class offerings, assign lecturers and set attendance locations.
        </p>
      </div>
      <RouterLink class="btn btn-primary" :to="{ name: 'admin-class-new' }"
        >New class</RouterLink
      >
    </header>

    <form class="ot-card mb-4" @submit.prevent="applyFilters">
      <div class="row g-3 align-items-end">
        <div class="col-12 col-md-5">
          <label class="form-label" for="class-filter-course">Course</label>
          <select
            id="class-filter-course"
            v-model="filters.courseId"
            class="form-select"
            aria-describedby="class-filter-course-help"
          >
            <option value="">All courses</option>
            <option
              v-for="course in courses"
              :key="course.id"
              :value="course.id"
            >
              {{ course.code }} · {{ course.name }}
            </option>
          </select>
          <div
            v-if="coursesError"
            id="class-filter-course-help"
            class="form-text text-danger"
          >
            {{ coursesError }}
          </div>
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label" for="class-filter-term">Term</label>
          <input
            id="class-filter-term"
            v-model="filters.term"
            class="form-control"
            :class="{ 'is-invalid': termError }"
            type="text"
            maxlength="50"
            placeholder="e.g. 2026-S2"
            :aria-invalid="Boolean(termError)"
            aria-describedby="class-filter-term-error"
          />
          <div id="class-filter-term-error" class="invalid-feedback">
            {{ termError }}
          </div>
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
      :title="
        Object.keys(applied).length ? 'No matching classes' : 'No classes yet'
      "
      :message="
        Object.keys(applied).length
          ? 'Try different filters.'
          : 'Create the first class to start.'
      "
    />
    <section v-else :aria-busy="loading" aria-label="Classes">
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
            <div class="d-flex flex-wrap gap-2 mt-auto">
              <RouterLink
                class="btn btn-primary"
                :to="{ name: 'admin-class-edit', params: { classId: cls.id } }"
                :aria-label="`Edit ${cls.course?.code} section ${cls.section}, ${cls.term}`"
                >Edit</RouterLink
              >
              <RouterLink
                class="btn btn-outline-primary"
                :to="{
                  name: 'admin-class-enrolments',
                  params: { classId: cls.id },
                }"
                :aria-label="`Manage students in ${cls.course?.code} section ${cls.section}`"
                >Students</RouterLink
              >
              <RouterLink
                class="btn btn-outline-primary"
                :to="{
                  name: 'admin-class-schedule',
                  params: { classId: cls.id },
                }"
                :aria-label="`Schedule sessions for ${cls.course?.code} section ${cls.section}`"
                >Schedule</RouterLink
              >
            </div>
          </article>
        </div>
      </div>
      <ClassPagination
        :meta="meta"
        :disabled="loading"
        label="Class pages"
        @change="setPage"
      />
    </section>
  </div>
</template>
