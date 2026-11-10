<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import FormField from '../../courses/components/FormField.vue';
import { usePagedList } from '../../courses/composables/use-paged-list.js';
import AdminUserList from '../components/AdminUserList.vue';
import OneTimePasswordCard from '../components/OneTimePasswordCard.vue';
import ResetPasswordDialog from '../components/ResetPasswordDialog.vue';
import TemporaryPasswordField from '../components/TemporaryPasswordField.vue';
import { useCreateAccount } from '../composables/use-create-account.js';
import { useResetPassword } from '../composables/use-reset-password.js';
import { ACCOUNT_ROLES } from '../services/admin-user-validation.js';
import { adminUsersService } from '../services/index.js';

const router = useRouter();
const create = useCreateAccount({ service: adminUsersService });
const reset = useResetPassword({ service: adminUsersService });

// The temporary password lives here only until the admin clicks Done.
const issued = ref(null); // { heading, user, password }
const card = ref();
const formElement = ref();

const search = ref('');
const applied = ref('');
const searchError = ref('');
const roleFilter = ref('');
const {
  rows: users,
  meta,
  loading,
  error,
  load,
  reload,
  setPage,
  cancel,
} = usePagedList((params, options) => adminUsersService.list(params, options), {
  filters: () => ({
    ...(applied.value ? { search: applied.value } : {}),
    ...(roleFilter.value ? { role: roleFilter.value } : {}),
  }),
});

async function showIssued(heading, user, password) {
  issued.value = { heading, user, password };
  await nextTick();
  card.value?.focus();
}

async function focusFirstError() {
  await nextTick();
  formElement.value?.querySelector('[aria-invalid="true"]')?.focus();
}

async function submitCreate() {
  issued.value = null;
  const result = await create.submit();
  if (!result) return;
  if (result.status === 'created') {
    await showIssued('Account created', result.user, result.password);
    reload();
  } else if (result.status === 'forbidden') {
    router.replace({ name: 'forbidden' });
  } else focusFirstError();
}

function openReset(user) {
  issued.value = null;
  reset.open(user);
}

async function submitReset() {
  const result = await reset.submit();
  if (result?.status === 'reset')
    await showIssued('Password reset', result.user, result.password);
  else if (result?.status === 'forbidden')
    router.replace({ name: 'forbidden' });
}

function applySearch() {
  const value = search.value.trim();
  if (value.length > 100) {
    searchError.value = 'Search must be 100 characters or fewer.';
    return;
  }
  searchError.value = '';
  applied.value = value;
  reload();
}
function clearFilters() {
  search.value = '';
  searchError.value = '';
  applied.value = '';
  roleFilter.value = '';
  reload();
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
onMounted(load);
onBeforeUnmount(() => {
  cancel();
  issued.value = null;
});
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Admin · Accounts</p>
        <h1 class="ot-page-title">Create account</h1>
        <p class="ot-subtitle">
          Create student and lecturer accounts with a temporary password. The
          user must change it at first sign-in.
        </p>
      </div>
    </header>

    <OneTimePasswordCard
      v-if="issued"
      ref="card"
      class="mb-4"
      :heading="issued.heading"
      :user="issued.user"
      :password="issued.password"
      @done="issued = null"
    />

    <form
      ref="formElement"
      class="ot-card mb-4"
      novalidate
      :aria-busy="create.saving.value"
      @submit.prevent="submitCreate"
    >
      <h2 class="ot-section-title">New account</h2>
      <p
        v-if="create.notice.value"
        class="ot-notice ot-notice--error mb-4"
        role="alert"
      >
        {{ create.notice.value.text }}
      </p>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <FormField
            id="account-name"
            label="Full name"
            required
            :error="create.errors.value.name"
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="create.form.name"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="text"
                maxlength="100"
                autocomplete="off"
                required
                :disabled="create.saving.value"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              />
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-6">
          <FormField
            id="account-email"
            label="Email"
            required
            :error="create.errors.value.email"
            hint="The user signs in with this email."
          >
            <template #default="field">
              <input
                :id="field.id"
                v-model="create.form.email"
                class="form-control"
                :class="{ 'is-invalid': field.invalid }"
                type="email"
                maxlength="254"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                required
                :disabled="create.saving.value"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              />
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-4">
          <FormField
            id="account-role"
            label="Role"
            required
            :error="create.errors.value.role"
          >
            <template #default="field">
              <select
                :id="field.id"
                v-model="create.form.role"
                class="form-select"
                :class="{ 'is-invalid': field.invalid }"
                required
                :disabled="create.saving.value"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedby"
              >
                <option
                  v-for="role in ACCOUNT_ROLES"
                  :key="role.value"
                  :value="role.value"
                >
                  {{ role.label }}
                </option>
              </select>
            </template>
          </FormField>
        </div>
        <div class="col-12 col-md-8">
          <TemporaryPasswordField
            id="account-password"
            v-model="create.form.temporary_password"
            :error="create.errors.value.temporary_password"
            :disabled="create.saving.value"
          />
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-4">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="create.saving.value"
        >
          <span
            v-if="create.saving.value"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          {{ create.saving.value ? 'Creating…' : 'Create account' }}
        </button>
      </div>
    </form>

    <section aria-labelledby="users-title">
      <h2 id="users-title" class="ot-section-title">Users</h2>
      <form class="ot-card mb-4" role="search" @submit.prevent="applySearch">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-6">
            <label class="form-label" for="user-search">Search users</label>
            <input
              id="user-search"
              v-model="search"
              class="form-control"
              :class="{ 'is-invalid': searchError }"
              type="search"
              maxlength="100"
              placeholder="Name or email"
              :aria-invalid="Boolean(searchError)"
              aria-describedby="user-search-error"
            />
            <div id="user-search-error" class="invalid-feedback">
              {{ searchError }}
            </div>
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label" for="user-role">Role</label>
            <select
              id="user-role"
              v-model="roleFilter"
              class="form-select"
              @change="reload"
            >
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="col-12 col-md-3 d-flex flex-wrap gap-2">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              Search
            </button>
            <button
              type="button"
              class="btn btn-outline-primary"
              :disabled="loading"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      <RequestState
        v-if="loading && !users.length"
        state="loading"
        title="Loading users…"
      />
      <RequestState
        v-else-if="error"
        state="error"
        title="Could not load users"
        :message="error.message"
        retry
        @retry="load"
      />
      <RequestState
        v-else-if="!users.length"
        state="empty"
        :title="applied || roleFilter ? 'No matching users' : 'No users yet'"
        :message="
          applied || roleFilter
            ? 'Try a different search or role.'
            : 'Create the first account above.'
        "
      />
      <div v-else :aria-busy="loading">
        <AdminUserList :users="users" @reset="openReset" />
        <ClassPagination
          :meta="meta"
          :disabled="loading"
          noun="user"
          plural-noun="users"
          label="User pages"
          @change="setPage"
        />
      </div>
    </section>

    <ResetPasswordDialog
      :open="Boolean(reset.target.value)"
      :busy="reset.busy.value"
      :user="reset.target.value"
      v-model:password="reset.password.value"
      :field-error="reset.fieldError.value"
      :error="reset.error.value"
      @submit="submitReset"
      @cancel="reset.close"
    />
  </div>
</template>
