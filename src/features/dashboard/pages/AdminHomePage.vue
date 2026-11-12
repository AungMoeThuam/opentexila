<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { auth } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import { coursesService } from '../../courses/services/index.js';
import { adminClassesService } from '../../enrolments/services/index.js';
import { useAdminHomeCounts } from '../composables/use-admin-home-counts.js';
import { ADMIN_HOME_LINKS, countLabel } from '../services/admin-home-links.js';

const { state, counts, load, retry, stop } = useAdminHomeCounts({
  coursesService,
  classesService: adminClassesService,
});

const name = computed(() => auth.state.user?.name);
// Only the cards that have a total show it, and only once it is known.
const cards = computed(() =>
  ADMIN_HOME_LINKS.map((link) => ({
    ...link,
    total: link.count ? countLabel(counts.value[link.key], link.count) : null,
  })),
);

onMounted(load);
onBeforeUnmount(stop);
</script>

<template>
  <header class="ot-page-header">
    <div>
      <h1 class="ot-page-title">
        {{ name ? `Welcome, ${name}` : 'Welcome' }}
      </h1>
      <p class="ot-subtitle">
        Set up courses and classes, manage enrolments and check attendance.
      </p>
    </div>
  </header>

  <RequestState
    v-if="state === 'loading'"
    class="mb-4"
    state="loading"
    title="Loading your overview…"
  />
  <RequestState
    v-else-if="state === 'error'"
    class="mb-4"
    state="error"
    title="Could not load the totals"
    message="The shortcuts below still work. Check your connection and try again."
    retry
    @retry="retry"
  />
  <RequestState
    v-else-if="state === 'empty'"
    class="mb-4"
    state="empty"
    title="Nothing is set up yet"
    message="Start with a course, then add a class for it."
  />

  <section aria-labelledby="admin-shortcuts-heading">
    <h2 id="admin-shortcuts-heading" class="ot-section-title">Shortcuts</h2>
    <ul class="row g-3 list-unstyled mb-0">
      <li
        v-for="card in cards"
        :key="card.key"
        class="col-12 col-md-6 col-xl-4"
      >
        <router-link
          :to="card.to"
          class="ot-card d-block p-3 text-decoration-none text-reset h-100"
          :data-test="`admin-home-${card.key}`"
        >
          <h3 class="ot-card__title">{{ card.title }}</h3>
          <p class="ot-meta mb-0">{{ card.description }}</p>
          <p v-if="card.total" class="ot-eyebrow mt-2 mb-0">
            {{ card.total }}
          </p>
        </router-link>
      </li>
    </ul>
  </section>
</template>
