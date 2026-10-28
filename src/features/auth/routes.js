// Replace each placeholder with an auth-owned page; preserve route names/contracts.
const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
export const publicAuthRoutes = [
  {
    path: 'login',
    name: 'login',
    component: page,
    props: { title: 'Sign in' },
    meta: { guestOnly: true },
  },
  {
    path: 'activate',
    name: 'activate',
    component: page,
    props: { title: 'Activate your account' },
  },
];
export const protectedAuthRoutes = [
  {
    path: 'admin/invitations',
    name: 'invitations',
    component: page,
    props: { title: 'Account invitations' },
    meta: { roles: ['admin'] },
  },
];
