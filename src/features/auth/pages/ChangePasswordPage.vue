<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth, api } from '../../../app-context.js';
import { validateChangePassword } from '../composables/change-password-validation.js';
import { createChangePasswordService } from '../services/change-password-service.js';

const router = useRouter();
const service = createChangePasswordService(api);

const form = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const errors = ref({});
const notice = ref('');
const saving = ref(false);
const signingOut = ref(false);
const canRetry = ref(false);

const visible = reactive({
  current_password: false,
  new_password: false,
  confirm_password: false,
});

function toggleVisibility(field) {
  visible[field] = !visible[field];
}

async function submit() {
  if (saving.value || signingOut.value) return;

  notice.value = '';
  canRetry.value = false;
  errors.value = validateChangePassword(form);

  if (Object.keys(errors.value).length) return;

  saving.value = true;

  try {
    await service.changePassword(form);

    // The backend invalidates the old JWT after a successful password change.
    // Use a full-page navigation to avoid the router's guest-status watcher
    // competing with the intended success redirect.
    api.clearAccessToken?.();
    window.location.replace(`${import.meta.env.BASE_URL}login?changed=1`);
    return;
  } catch (error) {
    if (error.status === 401 && error.code === 'INVALID_CREDENTIALS') {
      errors.value = {
        current_password: 'Current password is incorrect.',
      };
    } else if (error.status === 401) {
      api.clearAccessToken?.();
      auth.invalidate();
      await router.replace({ name: 'login' });
    } else if (error.status === 422) {
      const fields = error.fields ?? {};

      errors.value = {
        ...(fields.currentPassword || fields.current_password
          ? {
              current_password:
                fields.currentPassword ?? fields.current_password,
            }
          : {}),
        ...(fields.newPassword || fields.new_password
          ? { new_password: fields.newPassword ?? fields.new_password }
          : {}),
        ...(fields.confirmPassword || fields.confirm_password
          ? {
              confirm_password:
                fields.confirmPassword ?? fields.confirm_password,
            }
          : {}),
      };

      notice.value = error.message || 'Please check your passwords.';
    } else if (error.status === 429) {
      const seconds = error.retryAfter;

      notice.value =
        Number.isFinite(seconds) && seconds >= 0
          ? `Too many attempts. Try again in ${seconds} seconds.`
          : 'Too many attempts. Please try again later.';
    } else if (
      error.status >= 500 ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'INVALID_RESPONSE'
    ) {
      notice.value = 'The server is not available. Please try again.';
      canRetry.value = true;
    } else {
      notice.value =
        error.message || 'Unable to change password. Please try again.';
    }
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  if (saving.value || signingOut.value) return;

  signingOut.value = true;

  try {
    await auth.logout();
  } catch {
    api.clearAccessToken?.();
    auth.invalidate();
  } finally {
    signingOut.value = false;
    await router.replace({ name: 'login' });
  }
}
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Account security</p>
        <h1 class="ot-page-title">Change your password</h1>
        <p class="ot-subtitle">
          You must change your temporary password before continuing.
        </p>
      </div>
    </header>

    <form
      class="ot-card"
      novalidate
      :aria-busy="saving"
      @submit.prevent="submit"
    >
      <p v-if="notice" class="ot-notice ot-notice--error" role="alert">
        {{ notice }}
      </p>

      <div
        v-for="field in [
          { key: 'current_password', label: 'Current password' },
          { key: 'new_password', label: 'New password' },
          { key: 'confirm_password', label: 'Confirm new password' },
        ]"
        :key="field.key"
        class="mb-3"
      >
        <label class="form-label" :for="field.key">
          {{ field.label }}
        </label>

        <div class="input-group">
          <input
            :id="field.key"
            v-model="form[field.key]"
            class="form-control"
            :class="{ 'is-invalid': errors[field.key] }"
            :type="visible[field.key] ? 'text' : 'password'"
            :autocomplete="
              field.key === 'current_password'
                ? 'current-password'
                : 'new-password'
            "
            :aria-invalid="Boolean(errors[field.key])"
            :aria-describedby="
              errors[field.key] ? `${field.key}-error` : undefined
            "
            :disabled="saving || signingOut"
            required
          />

          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="saving || signingOut"
            :aria-label="`${visible[field.key] ? 'Hide' : 'Show'} ${field.label}`"
            @click="toggleVisibility(field.key)"
          >
            {{ visible[field.key] ? 'Hide' : 'Show' }}
          </button>
        </div>

        <div
          v-if="errors[field.key]"
          :id="`${field.key}-error`"
          class="text-danger small mt-1"
          role="alert"
        >
          {{ errors[field.key] }}
        </div>
      </div>

      <p class="text-muted small">
        Your new password must contain at least 12 characters.
      </p>

      <div class="d-flex flex-wrap gap-2 mt-4">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="saving || signingOut"
        >
          {{ saving ? 'Changing password...' : 'Change password' }}
        </button>

        <button
          v-if="canRetry"
          type="submit"
          class="btn btn-outline-primary"
          :disabled="saving || signingOut"
        >
          Retry
        </button>

        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="saving || signingOut"
          @click="signOut"
        >
          {{ signingOut ? 'Signing out...' : 'Sign out' }}
        </button>
      </div>
    </form>
  </div>
</template>
