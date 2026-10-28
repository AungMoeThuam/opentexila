<script setup>
import { RouterView } from 'vue-router';
import { defineAsyncComponent } from 'vue';
import { mockMode } from './app-context';
import NotificationHost from './shared/components/NotificationHost.vue';
const DevToolbar =
  import.meta.env.DEV && mockMode
    ? defineAsyncComponent(() => import('./dev/DevToolbar.vue'))
    : null;
</script>

<template>
  <DevToolbar v-if="mockMode" />
  <RouterView />
  <NotificationHost />
</template>
