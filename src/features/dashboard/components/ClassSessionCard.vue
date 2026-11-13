<script setup>
import { RouterLink } from 'vue-router';

// One class session as a card on a home page, in the same style as the
// student home page. `statusKind` is 'active' (in progress), 'cancelled' or
// empty. With `to` and `actionLabel` the card ends with a button.
defineProps({
  code: { type: String, default: '' },
  title: { type: String, required: true },
  section: { type: String, default: '' },
  statusLabel: { type: String, default: '' },
  statusKind: { type: String, default: '' },
  date: { type: String, default: '' },
  startsAt: { type: String, default: '' },
  endsAt: { type: String, default: '' },
  time: { type: String, required: true },
  room: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  actionLabel: { type: String, default: '' },
  primary: { type: Boolean, default: false },
});
</script>

<template>
  <article class="class-card">
    <div class="class-card-top">
      <span class="course-code">{{ code }}</span>

      <span
        v-if="statusLabel"
        class="session-status"
        :class="{
          'session-status--active': statusKind === 'active',
          'session-status--cancelled': statusKind === 'cancelled',
        }"
      >
        {{ statusLabel }}
      </span>
    </div>

    <h3 class="class-card-title">{{ title }}</h3>

    <p v-if="section" class="session-section">Section {{ section }}</p>

    <div class="session-details">
      <!-- Date -->
      <div v-if="date">
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
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>

        <span>{{ date }}</span>
      </div>

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
          <time v-if="startsAt" :datetime="startsAt">{{ time }}</time>
          <template v-else>{{ time }}</template>
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

        <span>{{ room || 'Room not assigned' }}</span>
      </div>
    </div>

    <RouterLink
      v-if="to && actionLabel"
      :to="to"
      class="btn mt-3 session-action"
      :class="primary ? 'btn-primary' : 'btn-outline-primary'"
    >
      {{ actionLabel }}

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
</template>

<style scoped>
.class-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  border: 1px solid #e7eaf0;
  border-radius: 13px;
  background: white;
}

.class-card-top {
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

.class-card-title {
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

@media (max-width: 767px) {
  .class-card {
    padding: 17px;
  }
}
</style>
