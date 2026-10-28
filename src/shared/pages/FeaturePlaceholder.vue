<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: 'This page is being prepared.' },
});
</script>
<template>
  <header class="ot-page-header">
    <div>
      <h1 class="ot-page-title">{{ title }}</h1>
      <p class="ot-subtitle">{{ description }}</p>
    </div>
  </header>
  <div class="ot-card ot-empty">
    <h2 class="ot-section-title">Coming soon</h2>
    <p class="ot-meta mb-0">This feature is not available yet.</p>
  </div>
</template>
