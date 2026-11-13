<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { auth } from '../../../app-context';
import AppIcon from '../../../shared/components/AppIcon.vue';
import RequestState from '../../../shared/components/RequestState.vue';
import { adminUsersService } from '../../auth/services/index.js';
import {
  coursesService,
  timetableService,
} from '../../courses/services/index.js';
import { adminClassesService } from '../../enrolments/services/index.js';
import { useAdminHomeCounts } from '../composables/use-admin-home-counts.js';
import { useAdminTodaySessions } from '../composables/use-admin-today-sessions.js';
import { ADMIN_HOME_LINKS, countLabel } from '../services/admin-home-links.js';
import { TIME_ZONE } from '../services/admin-home-today.js';

const { state, counts, load, retry, stop } = useAdminHomeCounts({
  coursesService,
  classesService: adminClassesService,
  usersService: adminUsersService,
});
const today = useAdminTodaySessions({ timetableService });

const adminName = computed(() => auth.state.user?.name?.trim() || 'Admin');

const todayLabel = new Intl.DateTimeFormat('en-MY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
}).format(new Date());

const timeFormat = new Intl.DateTimeFormat('en-MY', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : timeFormat.format(date);
}

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  ended: 'Ended',
  cancelled: 'Cancelled',
};

// A long day would push the quick access cards far down, so only the first
// cards show. Sessions that are running or still to come come first, then the
// ones that are over or cancelled; inside each group the time order is kept.
const MAX_CARDS = 6;
const PHASE_RANK = { in_progress: 0, upcoming: 1, ended: 2, cancelled: 3 };

const allSessions = computed(() =>
  [...today.sessions.value].sort(
    (a, b) => PHASE_RANK[a.phase] - PHASE_RANK[b.phase],
  ),
);
const sessions = computed(() => allSessions.value.slice(0, MAX_CARDS));
const hiddenCount = computed(() =>
  Math.max(0, allSessions.value.length - MAX_CARDS),
);
const activeCount = computed(
  () =>
    allSessions.value.filter((session) => session.phase === 'in_progress')
      .length,
);

// Totals shown on the quick access cards, once they are known.
const totals = computed(() => {
  const { courses, classes, students, lecturers } = counts.value;
  return {
    courses: countLabel(courses, ['course', 'courses']),
    classes: countLabel(classes, ['class', 'classes']),
    accounts:
      [
        countLabel(students, ['student', 'students']),
        countLabel(lecturers, ['lecturer', 'lecturers']),
      ]
        .filter(Boolean)
        .join(' · ') || null,
  };
});

const quickLinks = computed(() =>
  ADMIN_HOME_LINKS.map((link) => ({
    ...link,
    total: totals.value[link.key] ?? null,
  })),
);

function reload() {
  load();
  today.load();
}

onMounted(reload);
onBeforeUnmount(() => {
  stop();
  today.stop();
});
</script>

<template>
  <div class="admin-home">
    <!-- Welcome header -->
    <header class="ot-page-header admin-home-header">
      <div>
        <p class="ot-eyebrow">ADMIN DASHBOARD</p>

        <h1 class="ot-page-title">Welcome back, {{ adminName }}!</h1>

        <p class="ot-subtitle">
          Here's an overview of your institution and today's sessions.
        </p>
      </div>

      <div class="admin-date">
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

    <!-- Today's sessions -->
    <section class="admin-section" aria-labelledby="today-sessions-heading">
      <div class="section-heading">
        <div>
          <p class="ot-eyebrow">YOUR DAY AT A GLANCE</p>

          <h2 id="today-sessions-heading" class="ot-section-title">
            Today's sessions
          </h2>

          <p class="section-description">
            Class sessions scheduled for today across all classes.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-outline-primary btn-sm refresh-button"
          :disabled="today.state.value === 'loading'"
          @click="reload"
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

          {{ today.state.value === 'loading' ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- Loading state -->
      <RequestState
        v-if="today.state.value === 'loading'"
        state="loading"
        title="Loading today's sessions..."
        message="Getting the latest class schedule."
      />

      <!-- Error state -->
      <RequestState
        v-else-if="today.state.value === 'error'"
        state="error"
        title="Unable to load today's sessions"
        message="Check your connection and try again."
        retry
        @retry="today.retry"
      />

      <!-- Empty state -->
      <RequestState
        v-else-if="today.state.value === 'empty'"
        state="empty"
        title="No sessions scheduled for today"
        message="No class sessions are scheduled today. Open the timetable to schedule sessions."
      >
        <RouterLink to="/admin/timetable" class="btn btn-outline-primary mt-3">
          Open timetable
        </RouterLink>
      </RequestState>

      <!-- Sessions available -->
      <template v-else>
        <div class="today-summary" role="status">
          <div>
            <strong>{{ allSessions.length }}</strong>

            <span>
              {{
                allSessions.length === 1
                  ? 'session scheduled today'
                  : 'sessions scheduled today'
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
            v-for="session in sessions"
            :key="session.id"
            class="col-12 col-lg-6"
          >
            <article class="today-card">
              <div class="today-card-top">
                <span class="course-code">
                  {{ session.course.code }}
                </span>

                <span
                  class="session-status"
                  :class="{
                    'session-status--active': session.phase === 'in_progress',
                    'session-status--cancelled': session.phase === 'cancelled',
                  }"
                >
                  {{ STATUS_LABELS[session.phase] }}
                </span>
              </div>

              <h3 class="today-card-title">
                {{ session.course.name }}
              </h3>

              <p class="session-section">Section {{ session.section }}</p>

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

                  <span>{{ session.room_label || 'Room not assigned' }}</span>
                </div>

                <!-- Lecturer -->
                <div v-if="session.lecturer?.name">
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
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>

                  <span>{{ session.lecturer.name }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <p v-if="hiddenCount" class="more-note">
          {{ hiddenCount }} more
          {{ hiddenCount === 1 ? 'session' : 'sessions' }} today.
          <RouterLink to="/admin/timetable"
            >See them in the timetable</RouterLink
          >.
        </p>
      </template>
    </section>

    <!-- Quick access -->
    <section class="admin-section" aria-labelledby="quick-access-heading">
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

      <RequestState
        v-if="state === 'error'"
        class="mb-3"
        state="error"
        title="Could not load the totals"
        message="The shortcuts below still work. Check your connection and try again."
        retry
        @retry="retry"
      />
      <RequestState
        v-else-if="state === 'empty'"
        class="mb-3"
        state="empty"
        title="Nothing is set up yet"
        message="Start with a course, then add a class for it."
      />

      <div class="row g-3">
        <div
          v-for="link in quickLinks"
          :key="link.key"
          class="col-12 col-md-6 col-xl-4"
        >
          <RouterLink
            :to="link.to"
            class="quick-card"
            :aria-label="link.action"
            :data-test="`admin-home-${link.key}`"
          >
            <span class="quick-icon">
              <AppIcon :name="link.icon" :size="22" />
            </span>

            <span class="quick-card-content">
              <strong class="quick-title">
                {{ link.title }}
              </strong>

              <span class="quick-description">
                {{ link.description }}
              </span>

              <span v-if="link.total" class="quick-total">
                {{ link.total }}
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
  </div>
</template>

<style scoped>
.admin-home {
  width: 100%;
  min-width: 0;
}

.admin-home-header {
  margin-bottom: 30px;
}

.admin-date {
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

.admin-date svg {
  flex-shrink: 0;
  color: #b42336;
}

.admin-section {
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

.quick-total {
  color: #172a46;
  font-size: 12px;
  font-weight: 700;
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

.more-note {
  margin: 15px 0 0;
  color: #64748b;
  font-size: 12px;
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
  .admin-home-header {
    margin-bottom: 24px;
  }

  .admin-section {
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
