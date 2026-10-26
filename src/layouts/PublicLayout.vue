<script setup>
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <a class="visually-hidden-focusable skip-link" href="#main-content"
    >Skip to content</a
  >
  <header class="border-bottom bg-white">
    <nav class="container py-3" aria-label="Main navigation">
      <RouterLink class="brand text-decoration-none" :to="{ name: 'home' }"
        >OpenTexila</RouterLink
      >
    </nav>
  </header>
  <main id="main-content" class="container py-5" tabindex="-1">
    <RouterView />
  </main>
</template>
