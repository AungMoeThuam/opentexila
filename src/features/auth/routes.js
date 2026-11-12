export const publicAuthRoutes = [
  {
    path: 'login',
    name: 'login',
    component: () => import('./pages/LoginPage.vue'),
    props: { title: 'Sign in' },
    meta: { guestOnly: true },
  },
];

export const protectedAuthRoutes = [
  {
    path: 'activate',
    name: 'activate',
    component: () => import('./pages/ChangePasswordPage.vue'),
  },

  {
    path: 'admin/invitations',
    name: 'invitations',
    component: () => import('./pages/AdminCreateAccountPage.vue'),
    meta: { roles: ['admin'] },
  },
];
