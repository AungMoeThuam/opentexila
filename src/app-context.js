import { createApiClient } from './shared/services/api-client';
import { createSessionAdapter } from './features/auth/services/session-adapter';
import { createJwtSessionAdapter } from './features/auth/services/jwt-session-adapter';
import { createAuth } from './features/auth/store/create-auth';

export const devAuthMode =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
export const mockMode =
  !devAuthMode &&
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

let authInstance;

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  blocked: mockMode,
  onUnauthorized: () => authInstance?.invalidate(),
});

let adapter = devAuthMode
  ? createSessionAdapter(api)
  : createJwtSessionAdapter(api);

if (mockMode) {
  const { createMockSession } = await import('./dev/mock-session');
  adapter = createMockSession();
}

export const auth = (authInstance = createAuth(adapter));

export async function selectDemoRole(role) {
  if (devAuthMode) {
    if (role === 'guest') await adapter.logout();
    else
      await api.request('/dev/auth/select-role', {
        method: 'POST',
        body: { role },
      });
  } else if (mockMode) adapter.selectRole(role);
  else throw new Error('Role selection is development-only.');
  api.resetCsrf();
  await auth.restore({ force: true });
}
