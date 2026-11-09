const placeholder = () => import('../../shared/pages/FeaturePlaceholder.vue');
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
  // Placeholder until session scheduling (#17) replaces it; keep the name.
  {
    path: 'admin/classes/:classId(\\d+)/schedule',
    name: 'admin-class-schedule',
    component: placeholder,
    props: {
      title: 'Class schedule',
      description: 'Scheduling class sessions will be added in a later update.',
    },
    meta: admin,
  },
];
