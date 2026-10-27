<script setup>
// Sample layout only. Replace the static data below when the API and auth exist.
const announcements = [
  { date: '3 Jul 2025', title: 'Campus career fair', type: 'Event' },
  { date: '28 Jun 2025', title: 'Library extended hours', type: 'General' },
  {
    date: '25 Jun 2025',
    title: 'Update your contact information',
    type: 'Important',
  },
];
const classes = [
  {
    time: '09:00–11:00',
    module: 'COS30043 Interface Design',
    room: 'B-204',
    status: 'live',
    label: 'Class in progress',
  },
  {
    time: '13:00–15:00',
    module: 'COS30019 Intro to AI',
    room: 'B-110',
    status: 'upcoming',
    label: 'Upcoming',
  },
];
</script>

<template>
  <p class="ot-eyebrow">Sample layout · placeholder data</p>
  <h1 class="ot-page-title">Dashboard</h1>
  <p class="ot-subtitle mb-4">
    Starting point for the shared shell. Replace with real content in the
    dashboard feature.
  </p>

  <div class="ot-notice ot-notice--warning mb-3">
    <strong>Course registration is now open</strong>
    <p>Registration is available during the stated period.</p>
  </div>
  <div class="ot-notice mb-4">
    <strong>Check in within 15 minutes after class starts</strong>
  </div>

  <div class="row g-4">
    <section class="col-12 col-xl-7" aria-labelledby="announcements-title">
      <div class="ot-card h-100">
        <h2 id="announcements-title" class="ot-section-title mb-3">
          Announcements
        </h2>
        <div class="table-responsive">
          <table class="table ot-table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in announcements" :key="item.title">
                <td>{{ item.date }}</td>
                <td>{{ item.title }}</td>
                <td>{{ item.type }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="col-12 col-xl-5" aria-labelledby="classes-title">
      <div class="ot-card ot-card--live h-100">
        <h2 id="classes-title" class="ot-section-title mb-3">
          Today's classes
        </h2>
        <ul class="list-unstyled mb-0 d-grid gap-3">
          <li
            v-for="item in classes"
            :key="item.module"
            class="d-flex flex-wrap justify-content-between align-items-center gap-2"
          >
            <span>
              <strong class="d-block">{{ item.module }}</strong>
              <span class="ot-meta"
                >{{ item.time }} · Room {{ item.room }}</span
              >
            </span>
            <span class="ot-status" :class="`ot-status--${item.status}`">{{
              item.label
            }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
