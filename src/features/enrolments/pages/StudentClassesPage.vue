<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../components/ClassPagination.vue';
import StudentClassCard from '../components/StudentClassCard.vue';
import { useStudentClasses } from '../composables/use-student-classes.js';
import { studentClassesService } from '../services/index.js';
import { validateCourseId } from '../services/student-classes-query.js';

const router = useRouter();

const {
  classes,
  meta,
  loading,
  error,
  hasActiveFilters,
  load,
  setPage,
  setFilters,
  resetFilters,
  retry,
  reset,
} = useStudentClasses({ service: studentClassesService });

const filterInputs = reactive({
  term: '',
  courseId: '',
});

const courseIdError = ref('');

const canClear = computed(() => {
  return (
    hasActiveFilters.value ||
    Boolean(courseIdError.value) ||
    Boolean(filterInputs.term) ||
    (filterInputs.courseId !== '' &&
      filterInputs.courseId !== null &&
      filterInputs.courseId !== undefined)
  );
});

function handleCourseIdInput() {
  if (courseIdError.value) {
    courseIdError.value = '';
  }
}

function handleFilterSubmit() {
  const termStr =
    filterInputs.term !== undefined && filterInputs.term !== null
      ? String(filterInputs.term).trim()
      : '';

  const validation = validateCourseId(filterInputs.courseId);
  if (!validation.valid) {
    courseIdError.value = validation.error;
    return;
  }

  courseIdError.value = '';
  setFilters({
    term: termStr,
    courseId: validation.value !== undefined ? validation.value : '',
  });
}

function handleResetFilters() {
  filterInputs.term = '';
  filterInputs.courseId = '';
  courseIdError.value = '';
  resetFilters();
}

const errorMessage = computed(() => {
  if (!error.value) return '';
  if (error.value.fields && Object.keys(error.value.fields).length > 0) {
    return Object.values(error.value.fields).join(' ');
  }
  return error.value.message || 'Unable to load your enrolled classes.';
});

watch(error, (val) => {
  if (val?.status === 403 || val?.code === 'FORBIDDEN') {
    router.replace({ name: 'forbidden' });
  }
});

onMounted(load);
onBeforeUnmount(reset);
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Enrolments</p>
        <h1 class="ot-page-title">Enrolled classes</h1>
        <p class="ot-subtitle">
          Classes you are currently enrolled in for this academic term.
        </p>
      </div>
      <div class="ot-page-header__actions">
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="loading"
          @click="retry"
        >
          Refresh
        </button>
      </div>
    </header>

    <div class="card shadow-sm border-0 mb-4 bg-white">
      <div class="card-body">
        <form
          class="row g-3 align-items-end"
          @submit.prevent="handleFilterSubmit"
        >
          <div class="col-12 col-md-5 col-lg-4">
            <label
              for="filter-term"
              class="form-label fw-semibold small text-muted"
            >
              Term
            </label>
            <input
              id="filter-term"
              v-model="filterInputs.term"
              type="text"
              class="form-control form-control-sm"
              placeholder="e.g. 2026-S2"
            />
          </div>

          <div class="col-12 col-md-4 col-lg-3">
            <label
              for="filter-course-id"
              class="form-label fw-semibold small text-muted"
            >
              Course ID
            </label>
            <input
              id="filter-course-id"
              v-model="filterInputs.courseId"
              type="text"
              inputmode="numeric"
              class="form-control form-control-sm"
              :class="{ 'is-invalid': Boolean(courseIdError) }"
              placeholder="e.g. 101"
              aria-describedby="filter-course-id-feedback"
              @input="handleCourseIdInput"
            />
            <div
              v-if="courseIdError"
              id="filter-course-id-feedback"
              class="invalid-feedback d-block"
              role="alert"
            >
              {{ courseIdError }}
            </div>
          </div>

          <div class="col-12 col-md-auto d-flex gap-2">
            <button
              type="submit"
              class="btn btn-sm btn-primary"
              :disabled="loading"
            >
              Filter
            </button>
            <button
              v-if="canClear"
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="loading"
              @click="handleResetFilters"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>

    <RequestState
      v-if="loading && !classes.length"
      state="loading"
      title="Loading enrolled classes…"
    />

    <RequestState
      v-else-if="error && !classes.length"
      state="error"
      title="Could not load enrolled classes"
      :message="errorMessage"
      retry
      @retry="retry"
    />

    <template v-else>
      <RequestState
        v-if="!classes.length"
        state="empty"
        :title="
          hasActiveFilters ? 'No matching classes' : 'No enrolled classes'
        "
        :message="
          hasActiveFilters
            ? 'No enrolled classes match your selected filter criteria.'
            : 'You are not currently enrolled in any classes.'
        "
      >
        <button
          v-if="hasActiveFilters"
          type="button"
          class="btn btn-outline-primary mt-3"
          @click="handleResetFilters"
        >
          Clear filters
        </button>
      </RequestState>

      <section v-else :aria-busy="loading" aria-label="Enrolled classes list">
        <div class="row g-4">
          <div
            v-for="cls in classes"
            :key="cls.id"
            class="col-12 col-md-6 col-xl-4"
          >
            <StudentClassCard :class-info="cls" />
          </div>
        </div>

        <ClassPagination
          class="mt-4"
          :meta="meta"
          :disabled="loading"
          label="Enrolled classes pages"
          @change="setPage"
        />
      </section>
    </template>
  </div>
</template>
