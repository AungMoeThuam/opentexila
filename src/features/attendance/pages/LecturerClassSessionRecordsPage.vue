<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionContextHeader from '../components/SessionContextHeader.vue';
import RosterStatusFilter from '../components/RosterStatusFilter.vue';
import RosterTable from '../components/RosterTable.vue';
import SessionPagination from '../components/SessionPagination.vue';
import { useClassSessionRecords } from '../composables/use-class-session-records.js';
import { classSessionRecordsService } from '../services/index.js';

const route = useRoute();
const router = useRouter();

const {
  records,
  context,
  meta,
  status,
  loading,
  error,
  notFound,
  load,
  setStatus,
  setPage,
  retry,
  reset,
} = useClassSessionRecords({
  service: classSessionRecordsService,
  classSessionId: () => route.params.classSessionId,
});

const state = computed(() => {
  if (error.value) return 'error';
  if (loading.value && !records.value.length) return 'loading';
  if (!records.value.length) return 'empty';
  return 'success';
});

watch(error, (value) => {
  if (value?.status === 403) router.replace({ name: 'forbidden' });
});
watch(
  () => route.params.classSessionId,
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
    <h1 class="ot-section-title">Class session not found</h1>
    <p class="ot-meta">
      This class session does not exist, or it is not assigned to you.
    </p>
    <router-link class="btn btn-outline-primary" to="/lecturer/attendance">
      Back to class sessions
    </router-link>
  </div>

  <template v-else>
    <RequestState
      v-if="!context && state === 'loading'"
      state="loading"
      title="Loading attendance roster…"
    />
    <RequestState
      v-else-if="!context && state === 'error'"
      state="error"
      title="Could not load the attendance roster"
      :message="error.message"
      retry
      @retry="retry"
    />
    <template v-else-if="context">
      <SessionContextHeader class="mb-4" :context="context" />

      <RosterStatusFilter
        class="mb-4"
        :model-value="status"
        :disabled="loading"
        @change="setStatus"
      />

      <RequestState
        v-if="state === 'loading'"
        state="loading"
        title="Loading students…"
      />
      <RequestState
        v-else-if="state === 'error'"
        state="error"
        title="Could not load the attendance roster"
        :message="error.message"
        retry
        @retry="retry"
      />
      <RequestState
        v-else-if="state === 'empty'"
        state="empty"
        :title="status ? 'No students with this status' : 'No students yet'"
        :message="
          status
            ? 'Choose another status to see other students.'
            : 'Attendance rows appear once the class session starts.'
        "
      />
      <section v-else :aria-busy="loading" aria-label="Attendance roster">
        <RosterTable :records="records" />
        <SessionPagination
          class="mt-4"
          :meta="meta"
          :disabled="loading"
          noun="student"
          label="Attendance roster pages"
          @change="setPage"
        />
      </section>
    </template>
  </template>
</template>
