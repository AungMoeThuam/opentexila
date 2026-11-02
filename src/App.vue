<script setup>
import { RouterView } from 'vue-router';
import { defineAsyncComponent } from 'vue';
import { mockMode, devAuthMode } from './app-context';
import NotificationHost from './shared/components/NotificationHost.vue';
const DevToolbar =
  import.meta.env.DEV && (mockMode || devAuthMode)
    ? defineAsyncComponent(() => import('./dev/DevToolbar.vue'))
    : null;
</script>

<template>
  <DevToolbar v-if="mockMode || devAuthMode" />
  <RouterView />
  <NotificationHost />
</template>
