import { createRouter, createWebHistory } from 'vue-router';
import PublicLayout from '../layouts/PublicLayout.vue';
import authRoutes from '../features/auth/routes';
import attendanceRoutes from '../features/attendance/routes';

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
