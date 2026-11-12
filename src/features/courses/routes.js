const admin = { roles: ['admin'] };

// Paths follow docs/PAGES_AND_ROUTES.md (administrator pages).
export default [
  {
    path: 'admin/courses',
    name: 'admin-courses',
    component: () => import('./pages/AdminCoursesPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/courses/new',
    name: 'admin-course-new',
    component: () => import('./pages/AdminCourseFormPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/courses/:courseId(\\d+)/edit',
    name: 'admin-course-edit',
    component: () => import('./pages/AdminCourseFormPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/classes',
    name: 'admin-classes',
    component: () => import('./pages/AdminClassesPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/classes/new',
    name: 'admin-class-new',
    component: () => import('./pages/AdminClassFormPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/classes/:classId(\\d+)/edit',
    name: 'admin-class-edit',
    component: () => import('./pages/AdminClassFormPage.vue'),
    meta: admin,
  },
  // Session list with cancel (#17). Paired with backend #19.
  {
    path: 'admin/classes/:classId(\\d+)/schedule',
    name: 'admin-class-schedule',
    component: () => import('./pages/AdminClassSessionsPage.vue'),
    meta: admin,
  },
  {
    path: 'admin/classes/:classId(\\d+)/schedule/new',
    name: 'admin-class-session-new',
    component: () => import('./pages/AdminClassSessionFormPage.vue'),
    meta: admin,
  },
];
