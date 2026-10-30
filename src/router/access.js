export function homeForRole(role) {
  return role === 'student'
    ? '/my-classes'
    : role === 'teacher'
      ? '/lecturer/attendance'
      : '/enrolments';
}

export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\\x00-\x20]/.test(value) &&
    !/^\/(login|activate|session-unavailable)(?:[/?#]|$)/.test(value)
    ? value
    : fallback;
}

export function createAccessGuard(auth) {
  return async (to) => {
    if (!to.meta.requiresAuth && !to.meta.guestOnly) return true;
    await auth.restore();
    if (auth.state.status === 'error') {
      return { name: 'session-unavailable', query: { redirect: to.fullPath } };
    }
    if (to.meta.requiresAuth && !auth.state.user) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (to.meta.guestOnly && auth.state.user)
      return homeForRole(auth.state.user.role);
    const roles = to.meta.roles;
    if (roles && !roles.includes(auth.state.user?.role))
      return { name: 'forbidden' };
    return true;
  };
}
