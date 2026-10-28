export function createSessionAdapter(api) {
  return {
    async currentUser() {
      try {
        return (await api.request('/auth/me')).data;
      } catch (error) {
        if (error.status === 401) return null;
        throw error;
      }
    },
    async login(credentials) {
      const result = await api.request('/auth/login', {
        method: 'POST',
        body: credentials,
      });
      api.resetCsrf();
      return result.data;
    },
    async logout() {
      await api.request('/auth/logout', { method: 'POST' });
      api.resetCsrf();
    },
  };
}
