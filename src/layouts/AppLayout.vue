<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppIcon from '../shared/components/AppIcon.vue';
import AppSidebar from '../shared/components/AppSidebar.vue';

const STORAGE_KEY = 'ot-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const route = useRoute();
const collapsed = ref(readCollapsed());
const mobileOpen = ref(false);

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode); the preference is optional.
  }
});

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

// Below 992px the button opens the drawer; from 992px it collapses the sidebar.
function toggleNavigation() {
  if (window.matchMedia('(min-width: 992px)').matches) {
    collapsed.value = !collapsed.value;
  } else {
    mobileOpen.value = !mobileOpen.value;
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') mobileOpen.value = false;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <a class="visually-hidden-focusable skip-link" href="#main-content"
    >Skip to content</a
  >
  <div class="ot-shell">
    <AppSidebar
      :collapsed="collapsed"
      :open="mobileOpen"
      @close="mobileOpen = false"
      @expand="collapsed = false"
    />
    <div class="ot-shell__main">
      <header class="ot-topbar">
        <button
          type="button"
          class="ot-icon-btn"
          aria-controls="app-sidebar"
          :aria-expanded="mobileOpen || !collapsed"
          aria-label="Toggle navigation"
          @click="toggleNavigation"
        >
          <AppIcon name="menu" />
        </button>
        <span class="ot-topbar__spacer"></span>
        <!-- Placeholder until authentication supplies the signed-in user. -->
        <div class="ot-user">
          <span class="ot-user__avatar" aria-hidden="true">OT</span>
          <span class="d-none d-sm-block">
            <span class="ot-user__name">Signed-in user</span>
            <span class="ot-user__role">Role</span>
          </span>
        </div>
      </header>
      <main id="main-content" class="ot-shell__content ot-page" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
