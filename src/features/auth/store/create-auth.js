import { reactive, readonly } from 'vue';

function safeUser(user) {
  if (user === null) return null;
  if (
    !user ||
    !Number.isInteger(user.id) ||
    user.id < 1 ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    !['student', 'teacher', 'admin'].includes(user.role) ||
    user.status !== 'active'
  ) {
    throw new Error('The server returned an invalid user profile.');
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export function createAuth(adapter) {
  const state = reactive({ user: null, status: 'unknown', error: null });
  let pending;
  let version = 0;
  function apply(user) {
    state.user = safeUser(user);
    state.status = state.user ? 'authenticated' : 'guest';
    state.error = null;
  }
  function invalidate() {
    version += 1;
    pending = undefined;
    apply(null);
  }
  async function restore({ force = false } = {}) {
    if (pending && !force) return pending;
    if (!force && state.status !== 'unknown') return;
    const current = ++version;
    state.status = 'loading';
    pending = (async () => {
      try {
        const user = await adapter.currentUser();
        if (current === version) apply(user);
      } catch (error) {
        if (current === version) {
          state.user = null;
          state.status = 'error';
          state.error = error.message;
        }
      } finally {
        if (current === version) pending = undefined;
      }
    })();
    return pending;
  }
  return {
    state: readonly(state),
    restore,
    invalidate,
    async login(credentials) {
      const current = ++version;
      pending = undefined;
      const user = await adapter.login(credentials);
      if (!user)
        throw new Error('The server returned an invalid user profile.');
      if (current === version) apply(user);
    },
    async logout() {
      await adapter.logout();
      invalidate();
    },
  };
}
