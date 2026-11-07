<script setup>
import { reactive, onMounted, onBeforeUnmount } from 'vue';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionPagination from '../../attendance/components/SessionPagination.vue';
import { useMyClasses } from '../composables/use-my-classes.js';
import { myClassesService } from '../services/index.js';
const filters = reactive({ courseId: '', term: '' });
const {
  classes,
  courses,
  meta,
  loading,
  error,
  load,
  applyFilters,
  setPage,
  dispose,
} = useMyClasses({ service: myClassesService });
function apply() {
  applyFilters({ courseId: filters.courseId, term: filters.term.trim() });
}
function reset() {
  filters.courseId = '';
  filters.term = '';
  apply();
}
onMounted(load);
onBeforeUnmount(dispose);
</script>
<template>
  <header class="ot-page-header">
    <div>
      <p class="ot-eyebrow">Lecturer</p>
      <h1 class="ot-page-title">My classes</h1>
      <p class="ot-subtitle">
        Your assigned classes. Open a class to view its students.
      </p>
    </div>
  </header>
  <form class="ot-card mb-4" @submit.prevent="apply">
    <div class="row g-3 align-items-end">
      <div class="col-12 col-md-5">
        <label class="form-label" for="class-course">Course</label
        ><select
          id="class-course"
          v-model="filters.courseId"
          class="form-select"
        >
          <option value="">All courses</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.code }} — {{ course.name }}
          </option>
        </select>
      </div>
      <div class="col-12 col-md-3">
        <label class="form-label" for="class-term">Term</label
        ><input
          id="class-term"
          v-model="filters.term"
          class="form-control"
          maxlength="50"
          placeholder="e.g. 2026-S2"
        />
      </div>
      <div class="col-12 col-md-4 d-flex gap-2">
        <button class="btn btn-primary" :disabled="loading">
          Apply filters</button
        ><button
          type="button"
          class="btn btn-outline-primary"
          :disabled="loading"
          @click="reset"
        >
          Reset
        </button>
      </div>
    </div>
  </form>
  <RequestState v-if="loading" state="loading" title="Loading your classes…" />
  <RequestState
    v-else-if="error"
    state="error"
    title="Could not load your classes"
    :message="error.message"
    retry
    @retry="load"
  />
  <RequestState
    v-else-if="!classes.length"
    state="empty"
    title="No classes found"
    message="You may not have assigned classes yet, or no classes match your filters."
  />
  <div v-else class="row g-4">
    <div
      v-for="classroom in classes"
      :key="classroom.id"
      class="col-12 col-md-6 col-xl-4"
    >
      <article class="ot-card h-100 d-flex flex-column">
        <p class="ot-eyebrow">{{ classroom.course.code }}</p>
        <h2 class="ot-section-title">{{ classroom.course.name }}</h2>
        <dl class="row mt-3 mb-4">
          <dt class="col-4">Section</dt>
          <dd class="col-8">{{ classroom.section }}</dd>
          <dt class="col-4">Term</dt>
          <dd class="col-8">{{ classroom.term }}</dd>
          <dt class="col-4">Room</dt>
          <dd class="col-8">{{ classroom.room_label }}</dd>
        </dl>
        <RouterLink
          class="btn btn-outline-primary mt-auto"
          :to="{
            name: 'lecturer-class-students',
            params: { classId: classroom.id },
          }"
          :aria-label="`View students for ${classroom.course.code}, section ${classroom.section}, ${classroom.term}`"
          >View students</RouterLink
        >
      </article>
    </div>
  </div>
  <SessionPagination
    v-if="!loading && !error"
    :meta="meta"
    label="Assigned class pages"
    noun="class"
    @change="setPage"
  />
</template>
