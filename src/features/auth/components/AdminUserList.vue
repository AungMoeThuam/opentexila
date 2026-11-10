<script setup>
// Users as a table on wide screens and cards on narrow ones.
defineProps({
  users: { type: Array, required: true },
});
const emit = defineEmits(['reset']);

const roleLabel = (role) =>
  ({ student: 'Student', lecturer: 'Lecturer', admin: 'Admin' })[role] ?? role;
const statusLabel = (user) =>
  !user.is_active
    ? 'Inactive'
    : user.must_change_password
      ? 'Must change password'
      : 'Active';
// The server refuses to reset admin passwords, so no button is shown.
const canReset = (user) => user.role !== 'admin';
</script>

<template>
  <div>
    <div class="d-none d-md-block table-responsive ot-card p-0">
      <table class="table ot-table align-middle mb-0">
        <caption class="visually-hidden">
          Users
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <th scope="row" class="fw-semibold">{{ user.name }}</th>
            <td>{{ user.email }}</td>
            <td>{{ roleLabel(user.role) }}</td>
            <td>{{ statusLabel(user) }}</td>
            <td class="text-end">
              <button
                v-if="canReset(user)"
                type="button"
                class="btn btn-sm btn-outline-primary text-nowrap"
                :aria-label="`Reset password for ${user.name}`"
                @click="emit('reset', user)"
              >
                Reset password
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
      <li v-for="user in users" :key="user.id">
        <article class="ot-card">
          <p class="ot-eyebrow mb-1">{{ roleLabel(user.role) }}</p>
          <h3 class="h6 mb-1">{{ user.name }}</h3>
          <p class="mb-1 text-break">{{ user.email }}</p>
          <p class="ot-meta mb-3">{{ statusLabel(user) }}</p>
          <button
            v-if="canReset(user)"
            type="button"
            class="btn btn-outline-primary"
            :aria-label="`Reset password for ${user.name}`"
            @click="emit('reset', user)"
          >
            Reset password
          </button>
        </article>
      </li>
    </ul>
  </div>
</template>
