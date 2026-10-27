// Routes render inside AppLayout (sidebar + top bar). See src/router/index.js.
export default [
  {
    path: 'dashboard',
    name: 'dashboard',
    component: () => import('./pages/DashboardPage.vue'),
  },
];
