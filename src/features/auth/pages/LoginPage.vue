<script setup>
import { computed, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth } from '../../../app-context';
import { homeForRole, safeRedirect } from '../../../router/access';
import { useLogin } from '../composables/use-login';

const route = useRoute();
const router = useRouter();

const { form, errors, loading, canRetry, submit } = useLogin(auth);

const emailInput = ref(null);
const passwordInput = ref(null);
const showPassword = ref(false);

const notice = computed(() => {
  if (route.query.changed === '1') {
    return 'Password changed. Sign in with your new password.';
  }

  if (typeof route.query.redirect === 'string') {
    return 'Your session expired. Sign in again.';
  }

  return '';
});

async function handleSubmit() {
  const success = await submit();

  if (!success) {
    await nextTick();

    if (errors.email) {
      emailInput.value?.focus();
    } else if (errors.password) {
      passwordInput.value?.focus();
    }

    return;
  }

  const user = auth.state.user;

  if (!user) return;

  if (user.must_change_password === true) {
    await router.replace('/activate');
    return;
  }

  const home = homeForRole(user.role);
  const redirect = safeRedirect(route.query.redirect, home);

  await router.replace(redirect);
}
</script>

<template>
  <div class="login-page">
    <div class="card border-0 shadow-sm login-card">
      <div class="card-body p-4 p-md-5">
        <h1 class="h3 fw-semibold mb-2">Sign in</h1>

        <p class="text-muted mb-4">
          Welcome to OpenTexila. Sign in to continue.
        </p>

        <!-- Session and password change notices -->
        <div v-if="notice" class="alert alert-info" role="status">
          {{ notice }}
        </div>

        <!-- General login errors -->
        <div v-if="errors.general" class="alert alert-danger" role="alert">
          {{ errors.general }}
        </div>

        <form novalidate @submit.prevent="handleSubmit">
          <!-- Email -->
          <div class="mb-3">
            <label for="login-email" class="form-label"> Email </label>

            <input
              id="login-email"
              ref="emailInput"
              v-model="form.email"
              type="email"
              autocomplete="username"
              class="form-control"
              :class="{ 'is-invalid': errors.email }"
              :aria-invalid="Boolean(errors.email)"
              :aria-describedby="errors.email ? 'login-email-error' : undefined"
              :disabled="loading"
              required
            />

            <div
              v-if="errors.email"
              id="login-email-error"
              class="invalid-feedback"
            >
              {{ errors.email }}
            </div>
          </div>

          <!-- Password -->
          <div class="mb-3">
            <label for="login-password" class="form-label"> Password </label>

            <div class="input-group has-validation">
              <input
                id="login-password"
                ref="passwordInput"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="form-control"
                :class="{ 'is-invalid': errors.password }"
                :aria-invalid="Boolean(errors.password)"
                :aria-describedby="
                  errors.password ? 'login-password-error' : undefined
                "
                :disabled="loading"
                required
              />

              <button
                type="button"
                class="btn btn-outline-secondary"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                :disabled="loading"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>

              <div
                v-if="errors.password"
                id="login-password-error"
                class="invalid-feedback"
              >
                {{ errors.password }}
              </div>
            </div>
          </div>

          <!-- Sign In Button -->
          <button
            type="submit"
            class="btn btn-primary w-100 mt-2"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>

            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>

          <!-- Retry Button for network or server errors -->
          <button
            v-if="canRetry"
            type="submit"
            class="btn btn-outline-primary w-100 mt-2"
            :disabled="loading"
          >
            Retry
          </button>
        </form>

        <hr class="my-4" />

        <!-- Account information -->
        <p class="small text-muted mb-2">
          Accounts are created by your administrator.
        </p>

        <p class="small text-muted mb-0">
          Forgot password? Ask your administrator to reset it.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 65vh;
  padding-top: 2rem;
}

.login-card {
  width: 100%;
  max-width: 440px;
  border-radius: 0.75rem;
}

@media (max-width: 576px) {
  .login-page {
    padding-top: 0;
    min-height: auto;
  }
}
</style>
