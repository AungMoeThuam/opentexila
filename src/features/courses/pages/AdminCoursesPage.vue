<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import { usePagedList } from '../composables/use-paged-list.js';
import { coursesService } from '../services/index.js';

const router = useRouter();
const search = ref('');
const applied = ref('');
const searchError = ref('');
const {
  rows: courses,
  meta,
  loading,
  error,
  load,
  reload,
  setPage,
  cancel,
} = usePagedList((params, options) => coursesService.list(params, options), {
  filters: () => (applied.value ? { q: applied.value } : {}),
});

function applySearch() {
  const value = search.value.trim();
  if (value.length > 100) {
    searchError.value = 'Search must be 100 characters or fewer.';
    return;
  }
  searchError.value = '';
  applied.value = value;
  reload();
}
function clearSearch() {
  search.value = '';
  searchError.value = '';
  applied.value = '';
  reload();
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(load);
onBeforeUnmount(cancel);
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Courses</p>
        <h1 class="ot-page-title">Courses</h1>
        <p class="ot-subtitle">
          Create courses and correct their codes or names.
        </p>
      </div>
      <RouterLink class="btn btn-primary" :to="{ name: 'admin-course-new' }"
        >New course</RouterLink
      >
    </header>

    <form class="ot-card mb-4" role="search" @submit.prevent="applySearch">
      <div class="row g-3 align-items-end">
        <div class="col-12 col-md-8">
          <label class="form-label" for="course-search">Search courses</label>
          <input
            id="course-search"
            v-model="search"
            class="form-control"
            :class="{ 'is-invalid': searchError }"
            type="search"
            maxlength="100"
            placeholder="Code or name, e.g. COS30043"
            :aria-invalid="Boolean(searchError)"
            aria-describedby="course-search-error"
          />
          <div id="course-search-error" class="invalid-feedback">
            {{ searchError }}
          </div>
        </div>
        <div class="col-12 col-md-4 d-flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            Search
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="loading"
            @click="clearSearch"
          >
            Clear
          </button>
        </div>
      </div>
    </form>

    <RequestState
      v-if="loading && !courses.length"
      state="loading"
      title="Loading courses…"
    />
    <RequestState
      v-else-if="error"
      state="error"
      title="Could not load courses"
      :message="error.message"
      retry
      @retry="load"
    />
    <RequestState
      v-else-if="!courses.length"
      state="empty"
      :title="applied ? 'No matching courses' : 'No courses yet'"
      :message="
        applied
          ? 'Try a different search.'
          : 'Create the first course to start.'
      "
    />
    <section v-else :aria-busy="loading" aria-label="Courses">
      <div class="d-none d-md-block table-responsive ot-card p-0">
        <table class="table ot-table align-middle mb-0">
          <caption class="visually-hidden">
            Courses
          </caption>
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Name</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="course in courses" :key="course.id">
              <td class="fw-semibold">{{ course.code }}</td>
              <th scope="row" class="fw-normal">{{ course.name }}</th>
              <td class="text-end">
                <div class="d-inline-flex flex-wrap gap-2 justify-content-end">
                  <RouterLink
                    class="btn btn-sm btn-outline-primary"
                    :to="{
                      name: 'admin-classes',
                      query: { courseId: course.id },
                    }"
                    :aria-label="`View classes for ${course.code}`"
                    >Classes</RouterLink
                  >
                  <RouterLink
                    class="btn btn-sm btn-outline-primary"
                    :to="{
                      name: 'admin-course-edit',
                      params: { courseId: course.id },
                    }"
                    :aria-label="`Edit ${course.code}`"
                    >Edit</RouterLink
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
        <li v-for="course in courses" :key="course.id">
          <article class="ot-card">
            <p class="ot-eyebrow mb-1">{{ course.code }}</p>
            <h2 class="h6 mb-3">{{ course.name }}</h2>
            <div class="d-flex flex-wrap gap-2">
              <RouterLink
                class="btn btn-outline-primary"
                :to="{ name: 'admin-classes', query: { courseId: course.id } }"
                :aria-label="`View classes for ${course.code}`"
                >Classes</RouterLink
              >
              <RouterLink
                class="btn btn-outline-primary"
                :to="{
                  name: 'admin-course-edit',
                  params: { courseId: course.id },
                }"
                :aria-label="`Edit ${course.code}`"
                >Edit</RouterLink
              >
            </div>
          </article>
        </li>
      </ul>
      <ClassPagination
        :meta="meta"
        :disabled="loading"
        noun="course"
        plural-noun="courses"
        label="Course pages"
        @change="setPage"
      />
    </section>
  </div>
</template>
