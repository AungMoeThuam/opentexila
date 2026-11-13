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
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import { adminClassesService } from '../../enrolments/services/index.js';
import { usePagedList } from '../composables/use-paged-list.js';
import {
  CLASS_PAGE_SIZE,
  listFilterQuery,
  parseId,
  termChoices,
} from '../services/class-list-query.js';
import { listAll } from '../services/course-class-services.js';
import { coursesService } from '../services/index.js';

const route = useRoute();
const router = useRouter();
// The filters live in the address (?courseId=3&term=2026-S2), so the class form
// can send the admin back to the list as it was.
const initial = listFilterQuery(route.query);
const filters = reactive({
  courseId: initial.courseId ? Number(initial.courseId) : '',
  term: initial.term ?? '',
});
const appliedFrom = (values) => ({
  ...(values.courseId ? { courseId: Number(values.courseId) } : {}),
  ...(values.term ? { term: values.term } : {}),
});
const applied = ref(appliedFrom(filters));
const courses = ref([]);
const coursesError = ref('');
let coursesController;

// Every class, only to know which terms exist for the Term list.
const allClasses = ref([]);
const termList = computed(() =>
  termChoices(allClasses.value, { current: filters.term }),
);

// The filters to hand on to the class form, so Cancel and Save come back to
// the list as it is.
// The Edit link also carries the page, so a save comes back to the same page.
const filterQuery = computed(() => ({
  ...listFilterQuery(applied.value),
  ...(page.value > 1 ? { page: String(page.value) } : {}),
}));
const newClassQuery = computed(() => listFilterQuery(applied.value));
const appliedSummary = computed(() => {
  const parts = [];
  if (applied.value.courseId) {
    const course = courses.value.find(
      (item) => item.id === applied.value.courseId,
    );
    parts.push(course ? course.code : `course ${applied.value.courseId}`);
  }
  if (applied.value.term) parts.push(`term ${applied.value.term}`);
  return parts.join(' · ');
});

// A class to scroll to and mark, for example the one that was just saved.
const highlightId = ref(parseId(route.query.highlight));
let scrolledTo = null;

// Reuses GET /classes from the enrolments feature (backend #7).
const {
  rows: classes,
  meta,
  page,
  loading,
  error,
  load,
  reload,
  setPage,
  cancel,
} = usePagedList(
  (params, options) => adminClassesService.list(params, options),
  { limit: CLASS_PAGE_SIZE, filters: () => applied.value },
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

async function loadTerms() {
  try {
    allClasses.value = await listAll(
      (params, options) => adminClassesService.list(params, options),
      { signal: coursesController.signal },
    );
  } catch {
    // The Term list then shows only the term that is chosen.
  }
}

function applyFilters() {
  applied.value = appliedFrom(filters);
  highlightId.value = null;
  router.replace({ query: listFilterQuery(applied.value) });
  reload();
}
function clearFilters() {
  filters.courseId = '';
  filters.term = '';
  applied.value = {};
  highlightId.value = null;
  router.replace({ query: {} });
  reload();
}

// Scroll to the highlighted class once the list has it, then take the
// highlight out of the address so a reload does not scroll again.
watch([classes, highlightId], async () => {
  const id = highlightId.value;
  if (!id || scrolledTo === id || !classes.value.some((item) => item.id === id))
    return;
  scrolledTo = id;
  await nextTick();
  const card = document.getElementById(`class-${id}`);
  if (!card) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  card.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  card.focus({ preventScroll: true });
  const { highlight: _highlight, page: _page, ...rest } = route.query;
  router.replace({ query: rest });
});

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(async () => {
  loadCourses();
  loadTerms();
  // The class form can open the list on the page that holds the class it saved.
  const startPage = parseId(route.query.page);
  if (startPage) page.value = startPage;
  await load();
  // A page past the end (classes were removed meanwhile): show the last page.
  const pages = meta.value?.totalPages;
  if (pages && !classes.value.length && page.value > pages) {
    await setPage(pages);
  }
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
      <RouterLink
        class="btn btn-primary"
        :to="{ name: 'admin-class-new', query: newClassQuery }"
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
          <select
            id="class-filter-term"
            v-model="filters.term"
            class="form-select"
          >
            <option value="">All terms</option>
            <option v-for="term in termList" :key="term" :value="term">
              {{ term }}
            </option>
          </select>
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

    <p
      v-if="appliedSummary"
      class="ot-meta d-flex flex-wrap align-items-center gap-2 mb-4"
      data-test="applied-filters"
    >
      <span>Showing only {{ appliedSummary }}.</span>
      <button
        type="button"
        class="btn btn-link btn-sm p-0"
        :disabled="loading"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </p>

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
          <article
            :id="`class-${cls.id}`"
            class="ot-card h-100 d-flex flex-column"
            :class="{ 'class-highlight': cls.id === highlightId }"
            tabindex="-1"
          >
            <p
              v-if="cls.id === highlightId"
              class="ot-status ot-status--present align-self-start mb-2"
              data-test="saved-note"
            >
              Saved just now
            </p>
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
            <div class="ot-class-actions mt-auto">
              <RouterLink
                class="btn btn-primary"
                :to="{
                  name: 'admin-class-edit',
                  params: { classId: cls.id },
                  query: filterQuery,
                }"
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

<style scoped>
/* The three card buttons share the row in equal columns, so they line up the same
   whether the sidebar is open or closed. When the card is too narrow for three,
   they wrap into an even grid and not a ragged row. */
.ot-class-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: 0.5rem;
}
.ot-class-actions :deep(.btn) {
  padding-inline: 0.5rem;
  white-space: nowrap;
}
.class-highlight {
  border-color: var(--ot-success);
  box-shadow: 0 0 0 3px var(--ot-success);
  background: var(--ot-success-bg);
}
</style>
