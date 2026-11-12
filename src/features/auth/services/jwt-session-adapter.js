import { ApiError } from '../../../shared/services/api-client.js';
import { createLoginService } from './login-service.js';

export function createJwtSessionAdapter(api) {
  const loginService = createLoginService({ api });

  let refreshRequest = null;
  let sessionVersion = 0;

  async function refreshSession() {
    if (refreshRequest) return refreshRequest;

    const version = sessionVersion;

    const request = (async () => {
      const response = await api.request('/auth/refresh', {
        method: 'POST',
      });

      const data = response?.data;
      const user = data?.user;

      if (
        typeof data?.accessToken !== 'string' ||
        !data.accessToken ||
        typeof data?.csrfToken !== 'string' ||
        !data.csrfToken ||
        !user ||
        !Number.isInteger(user.id) ||
        typeof user.name !== 'string' ||
        typeof user.email !== 'string' ||
        !['student', 'lecturer', 'admin'].includes(user.role) ||
        typeof user.must_change_password !== 'boolean'
      ) {
        throw new ApiError('The server returned an invalid refresh response.', {
          code: 'INVALID_RESPONSE',
        });
      }

      if (version !== sessionVersion) {
        throw new ApiError('The session changed. Please retry.', {
          code: 'SESSION_CHANGED',
        });
      }

      api.setAccessToken(data.accessToken);
      api.setCsrfToken(data.csrfToken);

      return user;
    })();

    refreshRequest = request;

    try {
      return await request;
    } finally {
      if (refreshRequest === request) {
        refreshRequest = null;
      }
    }
  }

  return {
    async login(credentials) {
      const version = ++sessionVersion;

      const result = await loginService.login(credentials);

      if (version !== sessionVersion) {
        throw new ApiError('The session changed. Please retry.', {
          code: 'SESSION_CHANGED',
        });
      }

      api.setAccessToken(result.accessToken);
      api.setCsrfToken(result.csrfToken);

      return result.user;
    },

    async currentUser() {
      if (!api.getAccessToken()) {
        try {
          return await refreshSession();
        } catch (error) {
          if (error.status === 401) return null;
          throw error;
        }
      }

      try {
        const response = await api.request('/auth/me');
        return response.data;
      } catch (error) {
        if (error.status === 401) {
          api.clearAccessToken();
          return null;
        }

        throw error;
      }
    },

    async logout() {
      ++sessionVersion;

      try {
        await api.request('/auth/logout', {
          method: 'POST',
        });
      } finally {
        api.clearAccessToken();
        api.resetCsrf();
      }
    },
  };
}
