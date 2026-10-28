import { createApiClient } from './shared/services/api-client';
import { createSessionAdapter } from './features/auth/services/session-adapter';
import { createAuth } from './features/auth/store/create-auth';

export const mockMode =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
let authInstance;
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  blocked: mockMode,
  onUnauthorized: () => authInstance?.invalidate(),
});
let adapter = createSessionAdapter(api);
if (mockMode) {
  const { createMockSession } = await import('./dev/mock-session');
  adapter = createMockSession();
}
export const auth = (authInstance = createAuth(adapter));
export async function selectDemoRole(role) {
  if (!mockMode) throw new Error('Mock authentication is development-only.');
  adapter.selectRole(role);
  api.resetCsrf();
  await auth.restore({ force: true });
}
