<script setup>
import { auth } from '../../app-context';
import { homeForRole } from '../../router/access';
</script>
<template>
  <h1 class="ot-page-title">You don’t have access to this page</h1>
  <p class="ot-subtitle mb-4">Choose a page available to your account.</p>
  <RouterLink class="btn btn-primary" :to="homeForRole(auth.state.user?.role)"
    >Return to my pages</RouterLink
  >
</template>
