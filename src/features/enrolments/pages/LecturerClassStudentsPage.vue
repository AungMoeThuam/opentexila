<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionPagination from '../../attendance/components/SessionPagination.vue';
import ClassContextHeader from '../components/ClassContextHeader.vue';
import ClassRosterTable from '../components/ClassRosterTable.vue';
import { useClassRoster } from '../composables/use-class-roster.js';
import { classRosterService } from '../services/index.js';

const route = useRoute();
const router = useRouter();

const {
  enrolments,
  context,
  meta,
  loading,
  error,
  notFound,
  load,
  setPage,
  retry,
  reset,
} = useClassRoster({
  service: classRosterService,
  classId: () => route.params.classId,
});

const state = computed(() => {
  if (error.value) return 'error';
  if (loading.value && !enrolments.value.length) return 'loading';
  if (!enrolments.value.length) return 'empty';
  return 'success';
});

watch(error, (value) => {
  if (value?.status === 403) router.replace({ name: 'forbidden' });
});
watch(
  () => route.params.classId,
  (id) => {
    if (!id) return;
    reset();
    load();
  },
);
onMounted(load);
</script>

<template>
  <div v-if="notFound" class="ot-card ot-empty">
    <h1 class="ot-section-title">Class not found</h1>
    <p class="ot-meta">
      This class does not exist, or it is not assigned to you.
    </p>
    <router-link class="btn btn-outline-primary" to="/lecturer/attendance">
      Back to attendance
    </router-link>
  </div>

  <template v-else>
    <RequestState
      v-if="!context && state === 'loading'"
      state="loading"
      title="Loading class roster…"
    />
    <RequestState
      v-else-if="!context && state === 'error'"
      state="error"
      title="Could not load the class roster"
      :message="error.message"
      retry
      @retry="retry"
    />
    <template v-else-if="context">
      <ClassContextHeader class="mb-4" :context="context" />

      <RequestState
        v-if="state === 'loading'"
        state="loading"
        title="Loading students…"
      />
      <RequestState
        v-else-if="state === 'error'"
        state="error"
        title="Could not load the class roster"
        :message="error.message"
        retry
        @retry="retry"
      />
      <RequestState
        v-else-if="state === 'empty'"
        state="empty"
        title="No students yet"
        message="Students appear here once they are enrolled in this class."
      />
      <section v-else :aria-busy="loading" aria-label="Class roster">
        <ClassRosterTable :enrolments="enrolments" />
        <SessionPagination
          class="mt-4"
          :meta="meta"
          :disabled="loading"
          noun="student"
          label="Class roster pages"
          @change="setPage"
        />
      </section>
    </template>
  </template>
</template>
