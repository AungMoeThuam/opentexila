<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth, selectDemoRole, devAuthMode } from '../app-context';
import { homeForRole } from '../router/access';
const router = useRouter();
const busy = ref(false);
const error = ref('');
async function changeRole(event) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await selectDemoRole(event.target.value);
    if (auth.state.status === 'error') throw new Error(auth.state.error);
    await router.replace(
      auth.state.user
        ? devAuthMode && auth.state.user.role === 'student'
          ? '/student/attendance'
          : homeForRole(auth.state.user.role)
        : '/login',
    );
  } catch (failure) {
    error.value = failure.message || 'Unable to switch development accounts.';
  } finally {
    busy.value = false;
    event.target.value = auth.state.user?.role ?? 'guest';
  }
}
</script>
<template>
  <aside class="ot-dev-toolbar" aria-label="Development tools">
    <strong>{{
      devAuthMode
        ? 'Development sign-in · real API and database'
        : 'Mock mode · no live API calls'
    }}</strong>
    <label for="demo-role">Preview as</label>
    <select
      id="demo-role"
      class="form-select"
      :value="auth.state.user?.role ?? 'guest'"
      :disabled="busy"
      @change="changeRole"
    >
      <option value="guest">Signed out</option>
      <option value="student">Student</option>
      <option value="teacher">Lecturer</option>
      <option value="admin">Admin</option>
    </select>
    <span v-if="error" role="alert">{{ error }}</span>
    <RouterLink to="/dev/example">Example page</RouterLink>
    <RouterLink to="/style-guide">Style guide</RouterLink>
  </aside>
</template>
