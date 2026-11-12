import { reactive, ref } from 'vue';
import { validateLogin } from './login-validation.js';

export function useLogin(auth) {
  const form = reactive({
    email: '',
    password: '',
  });

  const errors = reactive({
    email: '',
    password: '',
    general: '',
  });

  const loading = ref(false);
  const canRetry = ref(false);

  async function submit() {
    if (loading.value) return false;

    errors.email = '';
    errors.password = '';
    errors.general = '';
    canRetry.value = false;

    const result = validateLogin(form);

    if (!result.valid) {
      errors.email = result.errors.email ?? '';
      errors.password = result.errors.password ?? '';
      return false;
    }

    loading.value = true;

    try {
      await auth.login(result.values);
      form.password = '';
      return true;
    } catch (error) {
      if (error.status === 401) {
        errors.general = 'Email or password is incorrect.';
      } else if (error.code === 'CSRF_INVALID') {
        errors.general = 'Your session expired. Please try signing in again.';
      } else if (error.status === 403) {
        errors.general = 'Your account is not allowed to sign in.';
      } else if (error.status === 422) {
        errors.email = error.fields?.email ?? '';
        errors.password = error.fields?.password ?? '';
        errors.general = error.message || 'Please check your details.';
      } else if (error.status === 429) {
        const seconds = error.retryAfter;

        errors.general =
          Number.isFinite(seconds) && seconds >= 0
            ? `Too many attempts. Try again in ${seconds} seconds.`
            : 'Too many attempts. Please try again later.';
      } else if (
        error.status >= 500 ||
        error.code === 'NETWORK_ERROR' ||
        error.code === 'INVALID_RESPONSE' ||
        error.code === 'INVALID_CSRF_RESPONSE'
      ) {
        errors.general = 'The server is not available.';
        canRetry.value = true;
      } else {
        errors.general = 'Unable to sign in. Please try again.';
      }

      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    form,
    errors,
    loading,
    canRetry,
    submit,
  };
}
