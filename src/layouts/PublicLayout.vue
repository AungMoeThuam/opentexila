<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
// The login page already is the login form, so it needs no Log in button.
const showLogin = computed(() => route.name !== 'login');
// The landing page draws its own full-width sections; other pages sit in a
// padded container.
const fullWidth = computed(() => route.name === 'home');
</script>

<template>
  <a class="visually-hidden-focusable skip-link" href="#main-content"
    >Skip to content</a
  >
  <header class="border-bottom bg-white">
    <nav
      class="container py-3 d-flex align-items-center justify-content-between gap-3"
      aria-label="Main navigation"
    >
      <RouterLink class="ot-brand text-decoration-none" :to="{ name: 'home' }"
        >OpenTexila</RouterLink
      >
      <RouterLink
        v-if="showLogin"
        class="btn btn-primary btn-sm rounded-pill px-3"
        :to="{ name: 'login' }"
        >Log in</RouterLink
      >
    </nav>
  </header>
  <main
    id="main-content"
    :class="fullWidth ? '' : 'container py-5'"
    tabindex="-1"
  >
    <RouterView />
  </main>
</template>
