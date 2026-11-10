import { reactive, ref } from 'vue';
import { validateAccountForm } from '../services/admin-user-validation.js';
import { createAccountErrors } from '../services/admin-user-errors.js';

const emptyForm = () => ({
  name: '',
  email: '',
  role: 'student',
  temporary_password: '',
});

// Form state and submit for creating one account.
// submit() resolves to { status: 'created' | 'invalid' | 'forbidden' | 'failed' }
// or null when a request is already running.
export function useCreateAccount({ service }) {
  const form = reactive(emptyForm());
  const errors = ref({});
  const notice = ref(null); // { tone: 'error', text }
  const saving = ref(false);

  function reset() {
    Object.assign(form, emptyForm());
    errors.value = {};
    notice.value = null;
  }

  async function submit() {
    if (saving.value) return null;
    const check = validateAccountForm(form);
    errors.value = check.errors;
    notice.value = null;
    if (!check.valid) {
      notice.value = {
        tone: 'error',
        text: 'Please correct the highlighted fields.',
      };
      return { status: 'invalid' };
    }
    saving.value = true;
    try {
      const user = await service.create(check.payload);
      const password = check.payload.temporary_password;
      // The password leaves the form as soon as the account exists.
      reset();
      return { status: 'created', user, password };
    } catch (cause) {
      if (cause?.status === 403 && cause.code === 'FORBIDDEN')
        return { status: 'forbidden' };
      const mapped = createAccountErrors(cause);
      errors.value = mapped.fields;
      notice.value = { tone: 'error', text: mapped.message };
      return { status: 'failed' };
    } finally {
      saving.value = false;
    }
  }

  return { form, errors, notice, saving, submit, reset };
}
