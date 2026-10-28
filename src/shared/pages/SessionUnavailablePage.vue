<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth } from '../../app-context';
import { safeRedirect } from '../../router/access';
import RequestState from '../components/RequestState.vue';
const route = useRoute();
const router = useRouter();
const busy = ref(false);
async function retry() {
  busy.value = true;
  await auth.restore({ force: true });
  busy.value = false;
  if (auth.state.status !== 'error')
    await router.replace(safeRedirect(route.query.redirect, '/login'));
}
</script>
<template>
  <h1 class="ot-page-title">Unable to check your session</h1>
  <RequestState
    :state="busy ? 'loading' : 'error'"
    :message="
      busy
        ? 'Checking your session…'
        : 'Account services are unavailable. Please try again.'
    "
    retry
    @retry="retry"
  />
</template>
