<script setup>
import { RouterLink } from 'vue-router';
import AppIcon from '../../../shared/components/AppIcon.vue';

// One "Quick access" card of a home page, in the same style as the student
// home page. `icon` is a name from the shared icon set. `total` is an optional
// short line such as "5 courses".
defineProps({
  to: { type: String, required: true },
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  action: { type: String, required: true },
  total: { type: String, default: '' },
});
</script>

<template>
  <RouterLink :to="to" class="quick-card" :aria-label="action">
    <span class="quick-icon">
      <AppIcon :name="icon" :size="22" />
    </span>

    <span class="quick-card-content">
      <strong class="quick-title">{{ title }}</strong>

      <span class="quick-description">{{ description }}</span>

      <span v-if="total" class="quick-total">{{ total }}</span>

      <span class="quick-action">
        {{ action }}

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
</template>

<style scoped>
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

@media (max-width: 767px) {
  .quick-card {
    min-height: auto;
    gap: 13px;
    padding: 18px;
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
