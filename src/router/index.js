import { watch } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import PublicLayout from '../layouts/PublicLayout.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { publicAuthRoutes, protectedAuthRoutes } from '../features/auth/routes';
import enrolmentRoutes from '../features/enrolments/routes';
import attendanceRoutes from '../features/attendance/routes';
import { auth } from '../app-context';
import { createAccessGuard } from './access';

const router = createRouter({
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
        ...publicAuthRoutes,
        {
          path: 'session-unavailable',
          name: 'session-unavailable',
          component: () => import('../shared/pages/SessionUnavailablePage.vue'),
        },
      ],
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        ...protectedAuthRoutes,
        ...enrolmentRoutes,
        ...attendanceRoutes,
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('../shared/pages/ForbiddenPage.vue'),
        },
        ...(import.meta.env.DEV
          ? [
              {
                path: 'dev/example',
                name: 'example',
                component: () => import('../dev/ExamplePage.vue'),
              },
            ]
          : []),
      ],
    },
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
router.beforeEach(createAccessGuard(auth));
// An expired session must also clear a page already being displayed.
watch(
  () => auth.state.status,
  (status) => {
    if (status === 'guest' && router.currentRoute.value.meta.requiresAuth) {
      router.replace({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
    }
  },
);
export default router;
