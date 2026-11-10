import { ref, watch } from 'vue';
import { passwordError } from '../services/admin-user-validation.js';
import { resetPasswordErrors } from '../services/admin-user-errors.js';

// State for the reset-password dialog (target: id, name, email, role). The password only lives here until the
// dialog closes or the reset succeeds.
// submit() resolves to { status: 'reset' | 'invalid' | 'forbidden' | 'failed' }
// or null when no request can run.
export function useResetPassword({ service }) {
  const target = ref(null); // { id, name, email }
  const password = ref('');
  const fieldError = ref('');
  const error = ref('');
  const busy = ref(false);

  // An old length error is wrong as soon as the admin edits or generates.
  watch(password, () => (fieldError.value = ''), { flush: 'sync' });

  function open(user) {
    target.value = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    password.value = '';
    fieldError.value = '';
    error.value = '';
  }

  function close() {
    if (busy.value) return;
    target.value = null;
    password.value = '';
    fieldError.value = '';
    error.value = '';
  }

  async function submit() {
    if (busy.value || !target.value) return null;
    fieldError.value = passwordError(password.value);
    error.value = '';
    if (fieldError.value) return { status: 'invalid' };
    busy.value = true;
    const user = target.value;
    const temporary = password.value;
    try {
      await service.resetPassword(user.id, { temporary_password: temporary });
      target.value = null;
      password.value = '';
      return { status: 'reset', user, password: temporary };
    } catch (cause) {
      if (cause?.status === 403 && cause.code === 'FORBIDDEN')
        return { status: 'forbidden' };
      error.value = resetPasswordErrors(cause).message;
      return { status: 'failed' };
    } finally {
      busy.value = false;
    }
  }

  return { target, password, fieldError, error, busy, open, close, submit };
}
