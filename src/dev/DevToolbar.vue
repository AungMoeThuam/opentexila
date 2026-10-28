<script setup>
import { useRouter } from 'vue-router';
import { auth, selectDemoRole } from '../app-context';
import { homeForRole } from '../router/access';
const router = useRouter();
async function changeRole(event) {
  await selectDemoRole(event.target.value);
  await router.replace(
    auth.state.user ? homeForRole(auth.state.user.role) : '/login',
  );
}
</script>
<template>
  <aside class="ot-dev-toolbar" aria-label="Development tools">
    <strong>Mock mode · no live API calls</strong>
    <label for="demo-role">Preview as</label>
    <select
      id="demo-role"
      class="form-select"
      :value="auth.state.user?.role ?? 'guest'"
      @change="changeRole"
    >
      <option value="guest">Signed out</option>
      <option value="student">Student</option>
      <option value="teacher">Lecturer</option>
      <option value="admin">Admin</option>
    </select>
    <RouterLink to="/dev/example">Example page</RouterLink>
    <RouterLink to="/style-guide">Style guide</RouterLink>
  </aside>
</template>
