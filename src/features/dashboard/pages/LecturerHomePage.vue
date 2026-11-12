<script setup>
import { computed, onMounted } from 'vue';
import { auth } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import { classSessionsService } from '../../attendance/services/index.js';
import HomeSessionCard from '../components/HomeSessionCard.vue';
import { useLecturerHomeSessions } from '../composables/use-lecturer-home-sessions.js';

const { state, groups, load, retry } = useLecturerHomeSessions({
  service: classSessionsService,
});

const name = computed(() => auth.state.user?.name);
const sections = computed(() => [
  { title: 'Today', sessions: groups.value.today },
  { title: 'Upcoming', sessions: groups.value.upcoming },
]);

onMounted(load);
</script>

<template>
  <header class="ot-page-header">
    <div>
      <h1 class="ot-page-title">
        {{ name ? `Welcome, ${name}` : 'Welcome' }}
      </h1>
      <p class="ot-subtitle">Here is what is coming up for your classes.</p>
    </div>
  </header>

  <div class="row g-3 mb-4">
    <div class="col-12 col-md-6">
      <router-link
        to="/lecturer/classes"
        class="ot-card d-block p-3 text-decoration-none text-reset h-100"
      >
        <h2 class="ot-card__title">My classes</h2>
        <p class="ot-meta mb-0">
          View the classes you teach and their students.
        </p>
      </router-link>
    </div>
    <div class="col-12 col-md-6">
      <router-link
        to="/lecturer/attendance"
        class="ot-card d-block p-3 text-decoration-none text-reset h-100"
      >
        <h2 class="ot-card__title">Attendance</h2>
        <p class="ot-meta mb-0">
          Open attendance rosters for your class sessions.
        </p>
      </router-link>
    </div>
  </div>

  <section aria-labelledby="home-sessions-heading">
    <h2 id="home-sessions-heading" class="ot-section-title">
      Today's and upcoming class sessions
    </h2>

    <RequestState v-if="state === 'loading'" state="loading" />
    <RequestState
      v-else-if="state === 'error'"
      state="error"
      title="Could not load your class sessions"
      message="Check your connection and try again."
      retry
      @retry="retry"
    />
    <RequestState
      v-else-if="state === 'empty'"
      state="empty"
      title="No class sessions in the next 7 days"
      message="Sessions scheduled for your classes will appear here."
    />
    <template v-else>
      <template v-for="section in sections" :key="section.title">
        <div v-if="section.sessions.length" class="mb-4">
          <h3 class="ot-eyebrow">{{ section.title }}</h3>
          <ul class="list-unstyled d-grid gap-2 mb-0">
            <li v-for="session in section.sessions" :key="session.id">
              <HomeSessionCard :session="session" />
            </li>
          </ul>
        </div>
      </template>
      <router-link to="/lecturer/attendance">View all attendance</router-link>
    </template>
  </section>
</template>
