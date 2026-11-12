export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = 'REQUEST_FAILED',
      fields = {},
      retryAfter = null,
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

// Factory keeps HTTP behaviour testable without Vue or a running backend.
export function createApiClient({
  baseUrl = '/api/v1',
  fetcher = (...args) => fetch(...args),
  onUnauthorized = () => {},
  blocked = false,
} = {}) {
  let csrfToken;
  let csrfRequest;
  let generation = 0;
  let accessToken = null;

  const setAccessToken = (token) => {
    if (typeof token !== 'string' || !token) {
      throw new TypeError('Access token must be a non-empty string.');
    }
    accessToken = token;
  };

  const getAccessToken = () => accessToken;

  const clearAccessToken = () => {
    accessToken = null;
  };

  const resetCsrf = () => {
    generation += 1;
    csrfToken = undefined;
    csrfRequest = undefined;
  };

  const setCsrfToken = (token) => {
    if (typeof token !== 'string' || !token) {
      throw new TypeError('CSRF token must be a non-empty string.');
    }
    generation += 1;
    csrfRequest = undefined;
    csrfToken = token;
  };

  async function send(path, { method = 'GET', body, signal, token } = {}) {
    if (blocked) {
      throw new ApiError('Live API calls are disabled in mock mode.', {
        code: 'MOCK_MODE',
      });
    }

    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      /\\|\.\./.test(path)
    ) {
      throw new TypeError('Use an API-relative path such as /enrolments.');
    }

    let response;

    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { 'X-CSRF-Token': token } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError(
        'Cannot reach the server. Check your connection and retry.',
        { code: 'NETWORK_ERROR' },
      );
    }

    const payload =
      response.status === 204
        ? null
        : await response.json().catch((error) => {
            if (error.name === 'AbortError') throw error;
            return null;
          });

    if (!response.ok) {
      const detail =
        payload?.error && typeof payload.error === 'object'
          ? payload.error
          : {};

      const message = detail.message ?? payload?.message;
      const fields = detail.fields;

      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter =
        retryAfterHeader !== null && /^\d+$/.test(retryAfterHeader)
          ? Number(retryAfterHeader)
          : null;

      const error = new ApiError(
        response.status >= 500
          ? 'The server could not complete the request. Please retry.'
          : typeof message === 'string'
            ? message
            : Array.isArray(message)
              ? message.join(' ')
              : 'The request could not be completed.',
        {
          status: response.status,
          code: detail.code ?? `HTTP_${response.status}`,
          fields:
            fields && typeof fields === 'object' && !Array.isArray(fields)
              ? fields
              : {},
          retryAfter,
        },
      );

      if (
        response.status === 401 &&
        path !== '/auth/login' &&
        !(
          path === '/auth/change-password' &&
          error.code === 'INVALID_CREDENTIALS'
        )
      ) {
        clearAccessToken();
        resetCsrf();
        onUnauthorized();
      } else if (error.code === 'CSRF_INVALID') {
        resetCsrf();
      }

      throw error;
    }

    if (response.status !== 204 && payload === null) {
      throw new ApiError('The server returned an unexpected response.', {
        code: 'INVALID_RESPONSE',
      });
    }

    return payload;
  }

  async function getCsrf() {
    if (csrfToken) return csrfToken;

    if (!csrfRequest) {
      const version = generation;

      csrfRequest = send('/auth/csrf')
        .then((payload) => {
          const token = payload?.data?.csrfToken;

          if (typeof token !== 'string' || !token) {
            throw new ApiError('Unable to initialise the secure session.', {
              code: 'INVALID_CSRF_RESPONSE',
            });
          }

          if (version !== generation) {
            throw new ApiError('The session changed. Please retry.', {
              code: 'SESSION_CHANGED',
            });
          }

          csrfToken = token;
          return token;
        })
        .finally(() => {
          if (version === generation) csrfRequest = undefined;
        });
    }

    return csrfRequest;
  }

  return {
    resetCsrf,
    setCsrfToken,
    setAccessToken,
    getAccessToken,
    clearAccessToken,

    async request(path, options = {}) {
      const method = (options.method ?? 'GET').toUpperCase();

      const token =
        options.csrf === false || ['GET', 'HEAD', 'OPTIONS'].includes(method)
          ? undefined
          : await getCsrf();

      if (options.signal?.aborted) {
        throw new DOMException('Request cancelled', 'AbortError');
      }

      return send(path, { ...options, method, token });
    },
  };
}
