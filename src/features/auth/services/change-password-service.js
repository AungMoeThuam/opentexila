export function createChangePasswordService(api) {
  return {
    async changePassword({ current_password, new_password }) {
      return api.request('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: current_password,
          newPassword: new_password,
        },
        csrf: false,
      });
    },
  };
}
