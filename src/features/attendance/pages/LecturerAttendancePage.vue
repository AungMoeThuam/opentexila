<script setup>
import { computed, onMounted } from 'vue';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionFilters from '../components/SessionFilters.vue';
import SessionList from '../components/SessionList.vue';
import SessionPagination from '../components/SessionPagination.vue';
import { useLecturerSessions } from '../composables/use-lecturer-sessions.js';
import { classSessionsService } from '../services/index.js';

const {
  sessions,
  meta,
  filters,
  loading,
  error,
  filterError,
  classOptions,
  load,
  applyFilters,
  clearFilters,
  setPage,
  retry,
} = useLecturerSessions({ service: classSessionsService });

const hasFilters = computed(() =>
  Boolean(filters.classId || filters.from || filters.to),
);
const state = computed(() => {
  if (error.value) return 'error';
  if (loading.value && !sessions.value.length) return 'loading';
  if (!loading.value && !sessions.value.length) return 'empty';
  return 'success';
});

onMounted(load);
</script>

<template>
  <header class="ot-page-header">
    <div>
      <h1 class="ot-page-title">Attendance</h1>
      <p class="ot-subtitle">
        Class sessions for the classes you teach. Select a session to see its
        attendance roster.
      </p>
    </div>
  </header>

  <SessionFilters
    class="mb-4"
    :filters="filters"
    :class-options="classOptions"
    :filter-error="filterError"
    :loading="loading"
    @apply="applyFilters"
    @clear="clearFilters"
  />

  <RequestState
    v-if="state === 'loading'"
    state="loading"
    title="Loading class sessions…"
  />
  <RequestState
    v-else-if="state === 'error'"
    state="error"
    title="Could not load class sessions"
    :message="error.message"
    retry
    @retry="retry"
  />
  <RequestState
    v-else-if="state === 'empty'"
    state="empty"
    title="No class sessions found"
    :message="
      hasFilters
        ? 'No sessions match these filters. Clear them to see all sessions.'
        : 'You have no class sessions yet.'
    "
  />
  <section v-else :aria-busy="loading" aria-label="Class sessions">
    <SessionList :sessions="sessions" />
    <SessionPagination
      class="mt-4"
      :meta="meta"
      :disabled="loading"
      @change="setPage"
    />
  </section>
</template>
