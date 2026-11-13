<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { auth } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import { classSessionsService } from '../../attendance/services/index.js';
import ClassSessionCard from '../components/ClassSessionCard.vue';
import QuickAccessCard from '../components/QuickAccessCard.vue';
import { useLecturerHomeSessions } from '../composables/use-lecturer-home-sessions.js';
import { TIME_ZONE } from '../services/admin-home-today.js';
import {
  LECTURER_HOME_LINKS,
  UPCOMING_CARDS,
  todayCards,
  todaySummary,
  upcomingCards,
} from '../services/lecturer-home-view.js';

const { state, groups, load, retry } = useLecturerHomeSessions({
  service: classSessionsService,
});

const lecturerName = computed(
  () => auth.state.user?.name?.trim() || 'Lecturer',
);

const todayLabel = new Intl.DateTimeFormat('en-MY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
}).format(new Date());

const today = computed(() => todayCards(groups.value.today));
const summary = computed(() => todaySummary(groups.value.today));
const upcoming = computed(() => upcomingCards(groups.value.upcoming));
const upcomingShown = computed(() => upcoming.value.slice(0, UPCOMING_CARDS));
const hiddenUpcoming = computed(() =>
  Math.max(0, upcoming.value.length - UPCOMING_CARDS),
);
const loaded = computed(
  () => state.value === 'success' || state.value === 'empty',
);

onMounted(load);
</script>

<template>
  <div class="lecturer-home">
    <!-- Welcome header -->
    <header class="ot-page-header lecturer-home-header">
      <div>
        <p class="ot-eyebrow">LECTURER DASHBOARD</p>

        <h1 class="ot-page-title">Welcome back, {{ lecturerName }}!</h1>

        <p class="ot-subtitle">
          Here's an overview of your classes and sessions.
        </p>
      </div>

      <div class="lecturer-date">
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

    <!-- Today's classes -->
    <section class="lecturer-section" aria-labelledby="today-classes-heading">
      <div class="section-heading">
        <div>
          <p class="ot-eyebrow">YOUR DAY AT A GLANCE</p>

          <h2 id="today-classes-heading" class="ot-section-title">
            Today's classes
          </h2>

          <p class="section-description">
            The sessions of the classes you teach today.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-outline-primary btn-sm refresh-button"
          :disabled="state === 'loading'"
          @click="load"
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

          {{ state === 'loading' ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- Loading state -->
      <RequestState
        v-if="state === 'loading'"
        state="loading"
        title="Loading today's classes..."
        message="Getting your latest class schedule."
      />

      <!-- Error state -->
      <RequestState
        v-else-if="state === 'error'"
        state="error"
        title="Unable to load your classes"
        message="Check your connection and try again."
        retry
        @retry="retry"
      />

      <!-- Empty state -->
      <RequestState
        v-else-if="loaded && !today.length"
        state="empty"
        title="No classes scheduled for today"
        message="You have no class sessions today. Open attendance to see your other sessions."
      >
        <RouterLink
          to="/lecturer/attendance"
          class="btn btn-outline-primary mt-3"
        >
          Open attendance
        </RouterLink>
      </RequestState>

      <!-- Classes available -->
      <template v-else>
        <div class="today-summary" role="status">
          <div>
            <strong>{{ summary.total }}</strong>

            <span>
              {{
                summary.total === 1
                  ? 'class scheduled today'
                  : 'classes scheduled today'
              }}
            </span>
          </div>

          <span v-if="summary.inProgress" class="active-count">
            <span class="active-dot"></span>
            {{ summary.inProgress }} in progress
          </span>
        </div>

        <div class="row g-3">
          <div v-for="card in today" :key="card.id" class="col-12 col-lg-6">
            <ClassSessionCard v-bind="card" />
          </div>
        </div>
      </template>
    </section>

    <!-- Upcoming classes -->
    <section
      v-if="loaded && upcomingShown.length"
      class="lecturer-section"
      aria-labelledby="upcoming-classes-heading"
    >
      <div class="section-heading">
        <div>
          <p class="ot-eyebrow">COMING UP</p>

          <h2 id="upcoming-classes-heading" class="ot-section-title">
            Upcoming classes
          </h2>

          <p class="section-description">Your sessions over the next 7 days.</p>
        </div>

        <RouterLink
          to="/lecturer/attendance"
          class="btn btn-outline-primary btn-sm"
        >
          View all attendance
        </RouterLink>
      </div>

      <div class="row g-3">
        <div
          v-for="card in upcomingShown"
          :key="card.id"
          class="col-12 col-lg-6 col-xl-4"
        >
          <ClassSessionCard v-bind="card" />
        </div>
      </div>

      <p v-if="hiddenUpcoming" class="more-note">
        {{ hiddenUpcoming }} more
        {{ hiddenUpcoming === 1 ? 'session' : 'sessions' }} in the next 7 days.
        <RouterLink to="/lecturer/attendance">See them in attendance</RouterLink
        >.
      </p>
    </section>

    <!-- Quick access -->
    <section class="lecturer-section" aria-labelledby="quick-access-heading">
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
          v-for="link in LECTURER_HOME_LINKS"
          :key="link.key"
          class="col-12 col-md-6 col-xl-3"
        >
          <QuickAccessCard
            :to="link.to"
            :icon="link.icon"
            :title="link.title"
            :description="link.description"
            :action="link.action"
            :data-test="`lecturer-home-${link.key}`"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lecturer-home {
  width: 100%;
  min-width: 0;
}

.lecturer-home-header {
  margin-bottom: 30px;
}

.lecturer-date {
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

.lecturer-date svg {
  flex-shrink: 0;
  color: #b42336;
}

.lecturer-section {
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
  .lecturer-home-header {
    margin-bottom: 24px;
  }

  .lecturer-section {
    margin-bottom: 28px;
  }

  .section-heading {
    align-items: flex-start;
  }

  .refresh-button {
    width: 100%;
  }
}
</style>
