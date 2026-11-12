import { ApiError } from '../../../shared/services/api-client.js';

export function createLoginService({ api }) {
  return {
    async login({ email, password }) {
      const credentials = {
        email: email.trim(),
        password,
      };

      let response;

      try {
        response = await api.request('/auth/login', {
          method: 'POST',
          body: credentials,
        });
      } catch (error) {
        if (error.code !== 'CSRF_INVALID') {
          throw error;
        }

        // The API client already clears the invalid CSRF token.
        // Retry only the login request, and only once.
        response = await api.request('/auth/login', {
          method: 'POST',
          body: credentials,
        });
      }

      const data = response?.data;
      const user = data?.user;

      if (
        !data ||
        typeof data.accessToken !== 'string' ||
        !data.accessToken ||
        typeof data.csrfToken !== 'string' ||
        !data.csrfToken ||
        !user ||
        !Number.isInteger(user.id) ||
        typeof user.name !== 'string' ||
        typeof user.email !== 'string' ||
        !['student', 'lecturer', 'admin'].includes(user.role) ||
        typeof user.must_change_password !== 'boolean'
      ) {
        throw new ApiError('The server returned an invalid login response.', {
          code: 'INVALID_RESPONSE',
        });
      }

      return {
        accessToken: data.accessToken,
        csrfToken: data.csrfToken,
        user,
      };
    },
  };
}
