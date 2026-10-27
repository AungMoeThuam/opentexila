import { createRouter, createWebHistory } from 'vue-router';
import PublicLayout from '../layouts/PublicLayout.vue';
import AppLayout from '../layouts/AppLayout.vue';
import authRoutes from '../features/auth/routes';
import attendanceRoutes from '../features/attendance/routes';
import dashboardRoutes from '../features/dashboard/routes';

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...(import.meta.env.DEV
      ? [
          {
            path: '/style-guide',
            name: 'style-guide',
            component: () => import('../shared/pages/StyleGuidePage.vue'),
          },
        ]
      : []),
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../shared/pages/WelcomePage.vue'),
        },
        ...authRoutes,
      ],
    },
    // Signed-in pages render inside AppLayout. Add feature routes as children;
    // an auth guard will be added with authentication.
    {
      path: '/',
      component: AppLayout,
      children: [...dashboardRoutes],
    },
    ...attendanceRoutes,
    {
      path: '/:pathMatch(.*)*',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'not-found',
          component: () => import('../shared/pages/NotFoundPage.vue'),
        },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});
