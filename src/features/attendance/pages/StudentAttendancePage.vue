<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { api } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import SessionSummary from '../components/SessionSummary.vue';
import { createAttendanceService, errorMessage } from '../services/attendance';
const service = createAttendanceService(api);
const sessions = ref([]);
const meta = ref({ page: 1, totalPages: 0, total: 0 });
const loading = ref(false);
const error = ref('');
let controller;
let requestedPage = 1;
async function load(page = requestedPage) {
  requestedPage = page;
  controller?.abort();
  const current = (controller = new AbortController());
  loading.value = true;
  error.value = '';
  try {
    const result = await service.list(page, current.signal);
    if (current.signal.aborted) return;
    sessions.value = result.data;
    meta.value = result.meta;
  } catch (failure) {
    if (!current.signal.aborted) error.value = errorMessage(failure);
  } finally {
    if (!current.signal.aborted) loading.value = false;
  }
}
onBeforeUnmount(() => controller?.abort());
load();
</script>
<template>
  <header class="ot-page-header">
    <div>
      <p class="ot-eyebrow">Student attendance</p>
      <h1 class="ot-page-title">Scheduled classes</h1>
      <p class="ot-subtitle">
        View your sessions and check in when class is in progress. Times use
        your device’s timezone.
      </p>
    </div>
    <button class="btn btn-outline-primary" :disabled="loading" @click="load()">
      Refresh
    </button>
  </header>
  <RequestState
    v-if="loading"
    state="loading"
    title="Loading class sessions…"
  />
  <RequestState
    v-else-if="error"
    state="error"
    title="Unable to load classes"
    :message="error"
    retry
    @retry="load()"
  />
  <template v-else>
    <RequestState
      v-if="!sessions.length"
      state="empty"
      title="No scheduled classes"
      message="Your scheduled class sessions will appear here."
    />
    <div v-else class="row g-4">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="col-12 col-xl-6"
      >
        <article
          class="ot-card h-100"
          :class="{ 'ot-card--live': session.availability === 'in_progress' }"
        >
          <p class="ot-eyebrow">{{ session.class.course.code }}</p>
          <h2 class="ot-section-title mb-3">{{ session.class.course.name }}</h2>
          <SessionSummary :session="session" />
          <RouterLink
            class="btn btn-outline-primary mt-4"
            :to="{
              name: 'student-class-session-check-in',
              params: { classSessionId: session.id },
            }"
            :aria-label="`View session for ${session.class.course.code}`"
            >View session</RouterLink
          >
        </article>
      </div>
    </div>
    <nav
      v-if="meta.totalPages > 1"
      class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4"
      aria-label="Class session pages"
    >
      <button
        class="btn btn-outline-primary"
        :disabled="meta.page <= 1"
        @click="load(meta.page - 1)"
      >
        Previous
      </button>
      <span class="ot-meta"
        >Page {{ meta.page }} of {{ meta.totalPages }} ·
        {{ meta.total }} sessions</span
      >
      <button
        class="btn btn-outline-primary"
        :disabled="meta.page >= meta.totalPages"
        @click="load(meta.page + 1)"
      >
        Next
      </button>
    </nav>
  </template>
</template>
