export function homeForRole(role) {
  return role === 'student'
    ? '/student/home'
    : role === 'lecturer'
      ? '/lecturer/home'
      : '/admin/home';
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
    await auth.restore();

    if (
      !to.meta.requiresAuth &&
      !to.meta.guestOnly &&
      auth.state.user?.must_change_password !== true
    ) {
      return true;
    }

    if (auth.state.status === 'error') {
      return { name: 'session-unavailable', query: { redirect: to.fullPath } };
    }

    if (to.meta.requiresAuth && !auth.state.user) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (auth.state.user?.must_change_password === true) {
      if (to.name !== 'activate') {
        return { name: 'activate' };
      }
      return true;
    }

    if (to.name === 'activate' && auth.state.user) {
      return homeForRole(auth.state.user.role);
    }

    if (to.meta.guestOnly && auth.state.user) {
      return homeForRole(auth.state.user.role);
    }

    const roles = to.meta.roles;
    if (roles && !roles.includes(auth.state.user?.role)) {
      return { name: 'forbidden' };
    }

    return true;
  };
}
