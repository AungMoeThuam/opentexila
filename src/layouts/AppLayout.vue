<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { auth } from '../app-context';
import { notify } from '../shared/composables/notifications';
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
const router = useRouter();
const mobile = ref(window.matchMedia('(max-width: 991.98px)').matches);
const signingOut = ref(false);
async function signOut() {
  signingOut.value = true;
  try {
    await auth.logout();
    await router.replace('/login');
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    signingOut.value = false;
  }
}
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

let breakpoint;
function onBreakpoint(event) {
  mobile.value = event.matches;
  mobileOpen.value = false;
}
onMounted(() => {
  breakpoint = window.matchMedia('(max-width: 991.98px)');
  breakpoint.addEventListener('change', onBreakpoint);
});
onBeforeUnmount(() => breakpoint?.removeEventListener('change', onBreakpoint));
</script>

<template>
  <a class="visually-hidden-focusable skip-link" href="#main-content"
    >Skip to content</a
  >
  <div class="ot-shell">
    <AppSidebar
      :collapsed="!mobile && collapsed"
      :mobile="mobile"
      :role="auth.state.user?.role"
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
          :aria-expanded="mobile ? mobileOpen : !collapsed"
          aria-label="Toggle navigation"
          @click="toggleNavigation"
        >
          <AppIcon name="menu" />
        </button>
        <span class="ot-topbar__spacer"></span>
        <div class="ot-user">
          <span class="ot-user__avatar" aria-hidden="true">{{
            auth.state.user?.name.slice(0, 1)
          }}</span>
          <span class="d-none d-sm-block">
            <span class="ot-user__name">{{ auth.state.user?.name }}</span>
            <span class="ot-user__role">{{
              auth.state.user?.role === 'teacher'
                ? 'Lecturer'
                : auth.state.user?.role
            }}</span>
          </span>
        </div>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="signingOut"
          @click="signOut"
        >
          {{ signingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </header>
      <main id="main-content" class="ot-shell__content ot-page" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
