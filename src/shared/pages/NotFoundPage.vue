<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <h1 class="h2">Page not found</h1>
  <p class="text-secondary">
    This page does not exist or is not available yet.
  </p>
  <RouterLink class="btn btn-primary" :to="{ name: 'home' }"
    >Back to home</RouterLink
  >
</template>
