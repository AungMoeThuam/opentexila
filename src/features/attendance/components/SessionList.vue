<script setup>
import { computed } from 'vue';
import AvailabilityBadge from './AvailabilityBadge.vue';
import { formatSessionWindow } from '../../../shared/utils/format-datetime.js';

const props = defineProps({
  sessions: {
    type: Array,
    required: true,
  },
});

const rows = computed(() =>
  props.sessions.map((session) => {
    const { date, time } = formatSessionWindow(
      session.starts_at,
      session.ends_at,
    );
    const { course, section, term, room_label: room } = session.class;

    return {
      id: session.id,
      code: course.code,
      name: course.name,
      sectionTerm: [section, term].filter(Boolean).join(' / '),
      room: room || '—',
      date,
      time,
      availability: session.availability,
      path: `/lecturer/class-sessions/${session.id}`,
      label: `View roster for ${course.code} on ${date}`,
    };
  }),
);
</script>

<template>
  <div class="d-none d-md-block">
    <div
      class="table-responsive"
      tabindex="0"
      role="region"
      aria-label="Class sessions, horizontally scrollable on small screens"
    >
      <table class="table ot-table align-middle mb-0">
        <caption class="visually-hidden">
          Class sessions
        </caption>
        <thead>
          <tr>
            <th scope="col">Course</th>
            <th scope="col">Section / Term</th>
            <th scope="col">Room</th>
            <th scope="col">Date</th>
            <th scope="col">Time</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span class="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <span class="fw-bold d-block">{{ row.code }}</span>
              <span class="ot-meta">{{ row.name }}</span>
            </td>
            <td>{{ row.sectionTerm }}</td>
            <td>{{ row.room }}</td>
            <td>{{ row.date }}</td>
            <td>{{ row.time }}</td>
            <td>
              <AvailabilityBadge :availability="row.availability" />
            </td>
            <td>
              <router-link :to="row.path" :aria-label="row.label">
                View roster
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
    <li v-for="row in rows" :key="row.id">
      <article class="ot-card">
        <div
          class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3"
        >
          <div>
            <p class="fw-bold mb-0">{{ row.code }}</p>
            <p class="ot-meta mb-0">{{ row.name }}</p>
          </div>
          <AvailabilityBadge :availability="row.availability" />
        </div>
        <dl class="ot-dl mb-4">
          <div>
            <dt>Section / Term</dt>
            <dd>{{ row.sectionTerm }}</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>{{ row.room }}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{{ row.date }}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{{ row.time }}</dd>
          </div>
        </dl>
        <router-link
          class="btn btn-outline-primary w-100"
          :to="row.path"
          :aria-label="row.label"
        >
          View roster
        </router-link>
      </article>
    </li>
  </ul>
</template>
