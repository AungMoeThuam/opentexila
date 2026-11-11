<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { api, auth } from '../../../app-context.js';
import RequestState from '../../../shared/components/RequestState.vue';
import { createClassSessionsService } from '../../attendance/services/class-sessions-service.js';

const service = createClassSessionsService({ api });

const sessions = ref([]);
const loading = ref(false);
const error = ref(null);
const loaded = ref(false);
const today = ref(new Date());

let controller = null;

const studentName = computed(() => {
  const name = auth.state.user?.name?.trim();
  return name || 'Student';
});

const todayLabel = computed(() =>
  new Intl.DateTimeFormat('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today.value),
);

const todaySessions = computed(() =>
  [...sessions.value].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  ),
);

const activeCount = computed(
  () =>
    todaySessions.value.filter(
      (session) => session.availability === 'in_progress',
    ).length,
);

const quickLinks = [
  {
    title: 'My classes',
    description: 'View your enrolled courses and class details.',
    to: '/my-classes',
    icon: 'book',
    action: 'View my classes',
  },
  {
    title: 'Scheduled classes',
    description: 'Explore your sessions and check-in availability.',
    to: '/student/attendance',
    icon: 'calendar',
    action: 'View schedule',
  },
  {
    title: 'My attendance history',
    description: 'Review your attendance records and status.',
    to: '/attendance/history',
    icon: 'clipboard',
    action: 'View attendance',
  },
];

function localDayRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  return { start, end };
}

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function sessionTitle(session) {
  const course = session.class?.course;
  return course?.name || course?.code || 'Class session';
}

function sessionCode(session) {
  return session.class?.course?.code || 'Course';
}

function sessionRoom(session) {
  return session.room_label || session.class?.room_label || 'Room not assigned';
}

function availabilityLabel(value) {
  const labels = {
    upcoming: 'Upcoming',
    in_progress: 'In progress',
    ended: 'Ended',
    cancelled: 'Cancelled',
  };

  return labels[value] || 'Scheduled';
}

async function loadToday() {
  controller?.abort();

  const current = new AbortController();
  controller = current;

  loading.value = true;
  error.value = null;

  const now = new Date();
  today.value = now;

  const { start, end } = localDayRange(now);

  try {
    const collected = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await service.listMyClassSessions(
        {
          page,
          limit: 100,
          from: start,
          to: end,
        },
        { signal: current.signal },
      );

      if (current.signal.aborted) return;

      collected.push(...response.data);

      totalPages = Number(response.meta.totalPages);

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 0 ||
        totalPages > 10000
      ) {
        throw new Error('Invalid session pagination response.');
      }

      page += 1;
    } while (page <= totalPages);

    if (current.signal.aborted) return;

    sessions.value = collected.filter((session) => {
      const starts = new Date(session.starts_at).getTime();

      return (
        Number.isFinite(starts) &&
        starts >= start.getTime() &&
        starts < end.getTime()
      );
    });

    loaded.value = true;
  } catch (cause) {
    if (current.signal.aborted) return;

    error.value = cause?.message || "Unable to load today's classes.";

    sessions.value = [];
    loaded.value = false;
  } finally {
    if (controller === current) {
      loading.value = false;
      controller = null;
    }
  }
}

onMounted(loadToday);

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <main class="ot-page-content student-home">
    <!-- Welcome header -->
    <header class="ot-page-header student-home-header">
      <div>
        <p class="ot-eyebrow">STUDENT DASHBOARD</p>

        <h1 class="ot-page-title">Welcome back, {{ studentName }}!</h1>

        <p class="ot-subtitle">
          Here's an overview of your learning activities.
        </p>
      </div>

      <div class="student-date">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>

        <span>{{ todayLabel }}</span>
      </div>
    </header>

    <!-- Quick access -->
    <section class="student-section" aria-labelledby="quick-access-heading">
      <div class="section-heading">
        <div>
          <p class="ot-eyebrow">YOUR WORKSPACE</p>

          <h2 id="quick-access-heading" class="ot-section-title">
            Quick access
          </h2>

          <p class="section-description">
            Everything you need, just one click away.
          </p>
        </div>
      </div>

      <div class="row g-3">
        <div
          v-for="link in quickLinks"
          :key="link.to"
          class="col-12 col-md-6 col-xl-4"
        >
          <RouterLink
            :to="link.to"
            class="quick-card"
            :aria-label="link.action"
          >
            <span class="quick-icon">
              <!-- My classes: book -->
              <svg
                v-if="link.icon === 'book'"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 7a8 8 0 0 0-9-2v14a8 8 0 0 1 9 2" />
                <path d="M12 7a8 8 0 0 1 9-2v14a8 8 0 0 0-9 2" />
                <path d="M12 7v14" />
              </svg>

              <!-- Scheduled classes: calendar -->
              <svg
                v-else-if="link.icon === 'calendar'"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
                <path d="M8 14h.01M12 14h.01M16 14h.01" />
                <path d="M8 18h.01M12 18h.01" />
              </svg>

              <!-- Attendance history: clipboard -->
              <svg
                v-else-if="link.icon === 'clipboard'"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="5" width="16" height="16" rx="2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="m8 14 2 2 5-5" />
              </svg>
            </span>

            <span class="quick-card-content">
              <strong class="quick-title">
                {{ link.title }}
              </strong>

              <span class="quick-description">
                {{ link.description }}
              </span>

              <span class="quick-action">
                {{ link.action }}

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Today's classes -->
    <section class="student-section" aria-labelledby="today-classes-heading">
      <div class="section-heading">
        <div>
          <p class="ot-eyebrow">YOUR DAY AT A GLANCE</p>

          <h2 id="today-classes-heading" class="ot-section-title">
            Today's classes
          </h2>

          <p class="section-description">Your scheduled sessions for today.</p>
        </div>

        <button
          type="button"
          class="btn btn-outline-primary btn-sm refresh-button"
          :disabled="loading"
          @click="loadToday"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 11a8 8 0 1 0-2 6" />
            <path d="M20 4v7h-7" />
          </svg>

          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- Loading state -->
      <RequestState
        v-if="loading"
        state="loading"
        title="Loading today's classes..."
        message="Getting your latest class schedule."
      />

      <!-- Error state -->
      <RequestState
        v-else-if="error"
        state="error"
        title="Unable to load today's classes"
        :message="error"
        retry
        @retry="loadToday"
      />

      <!-- Empty state -->
      <RequestState
        v-else-if="loaded && !todaySessions.length"
        state="empty"
        title="No classes scheduled for today"
        message="You have no scheduled classes today. Check your full schedule for upcoming sessions."
      >
        <RouterLink
          to="/student/attendance"
          class="btn btn-outline-primary mt-3"
        >
          View scheduled classes
        </RouterLink>
      </RequestState>

      <!-- Classes available -->
      <template v-else-if="loaded">
        <div class="today-summary" role="status">
          <div>
            <strong>{{ todaySessions.length }}</strong>

            <span>
              {{
                todaySessions.length === 1
                  ? 'class scheduled today'
                  : 'classes scheduled today'
              }}
            </span>
          </div>

          <span v-if="activeCount" class="active-count">
            <span class="active-dot"></span>
            {{ activeCount }} in progress
          </span>
        </div>

        <div class="row g-3">
          <div
            v-for="session in todaySessions"
            :key="session.id"
            class="col-12 col-lg-6"
          >
            <article class="today-card">
              <div class="today-card-top">
                <span class="course-code">
                  {{ sessionCode(session) }}
                </span>

                <span
                  class="session-status"
                  :class="{
                    'session-status--active':
                      session.availability === 'in_progress',
                    'session-status--cancelled':
                      session.availability === 'cancelled',
                  }"
                >
                  {{ availabilityLabel(session.availability) }}
                </span>
              </div>

              <h3 class="today-card-title">
                {{ sessionTitle(session) }}
              </h3>

              <p class="session-section">
                Section {{ session.class?.section || '—' }}
              </p>

              <div class="session-details">
                <!-- Time -->
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>

                  <span>
                    <time :datetime="session.starts_at">
                      {{ formatTime(session.starts_at) }}
                    </time>
                    –
                    <time :datetime="session.ends_at">
                      {{ formatTime(session.ends_at) }}
                    </time>
                  </span>
                </div>

                <!-- Location -->
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>

                  <span>{{ sessionRoom(session) }}</span>
                </div>
              </div>

              <!-- Session details / check-in -->
              <RouterLink
                :to="{
                  name: 'student-class-session-check-in',
                  params: { classSessionId: session.id },
                }"
                class="btn mt-3 session-action"
                :class="
                  session.availability === 'in_progress'
                    ? 'btn-primary'
                    : 'btn-outline-primary'
                "
              >
                {{
                  session.availability === 'in_progress'
                    ? 'Go to check-in'
                    : 'View session'
                }}

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </RouterLink>
            </article>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.student-home {
  width: 100%;
  min-width: 0;
}

.student-home-header {
  margin-bottom: 30px;
}

.student-date {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  align-self: flex-start;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.student-date svg {
  flex-shrink: 0;
  color: #b42336;
}

.student-section {
  margin-bottom: 36px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.section-description {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  height: 100%;
  min-height: 185px;
  padding: 22px;
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  background: white;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.quick-card:hover {
  border-color: #d9a2ab;
  box-shadow: 0 8px 24px rgb(15 23 42 / 6%);
  transform: translateY(-2px);
}

.quick-card:focus-visible {
  outline: 3px solid #b42336;
  outline-offset: 3px;
}

.quick-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #fceef0;
  color: #b42336;
}

.quick-icon svg {
  display: block;
  flex-shrink: 0;
}

.quick-card-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
}

.quick-title {
  color: #172a46;
  font-size: 15px;
  font-weight: 700;
}

.quick-description {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.quick-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  color: #b42336;
  font-size: 12px;
  font-weight: 700;
}

.quick-action svg {
  flex-shrink: 0;
}

.today-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 15px;
  padding: 13px 16px;
  border-radius: 10px;
  background: #f3f6fb;
  color: #52627b;
  font-size: 12px;
}

.today-summary strong {
  margin-right: 6px;
  color: #172a46;
  font-size: 17px;
}

.active-count {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #166534;
  font-weight: 600;
}

.active-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
}

.today-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  border: 1px solid #e7eaf0;
  border-radius: 13px;
  background: white;
}

.today-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.course-code {
  color: #b42336;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.session-status {
  padding: 5px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}

.session-status--active {
  background: #dcfce7;
  color: #166534;
}

.session-status--cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.today-card-title {
  margin-bottom: 5px;
  color: #172a46;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.session-section {
  margin-bottom: 16px;
  color: #64748b;
  font-size: 12px;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  color: #475569;
  font-size: 12px;
}

.session-details > div {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.session-details svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #94a3b8;
}

.session-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  font-size: 12px;
  font-weight: 600;
}

.session-action svg {
  flex-shrink: 0;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.refresh-button svg {
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .student-home-header {
    margin-bottom: 24px;
  }

  .student-section {
    margin-bottom: 28px;
  }

  .quick-card {
    min-height: auto;
    gap: 13px;
    padding: 18px;
  }

  .today-card {
    padding: 17px;
  }

  .section-heading {
    align-items: flex-start;
  }

  .refresh-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quick-card {
    transition: none;
  }

  .quick-card:hover {
    transform: none;
  }
}
</style>
