const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
const StudentClassesPage = () => import('./pages/StudentClassesPage.vue');

export default [
  {
    path: 'student/classes',
    name: 'student-classes',
    component: StudentClassesPage,
    meta: { roles: ['student'] },
  },
  {
    path: 'lecturer/classes',
    name: 'lecturer-classes',
    component: () => import('./pages/LecturerClassesPage.vue'),
    meta: { roles: ['lecturer'] },
  },
  {
    path: 'my-classes',
    name: 'my-classes',
    component: StudentClassesPage,
    meta: { roles: ['student'] },
  },
  {
    path: 'admin/enrolments',
    name: 'admin-enrolments',
    component: () => import('./pages/AdminClassListPage.vue'),
    meta: { roles: ['admin'] },
  },
  {
    path: 'admin/enrolments/:classId',
    name: 'admin-class-enrolments',
    component: () => import('./pages/AdminClassEnrolmentsPage.vue'),
    meta: { roles: ['admin'] },
  },
  {
    path: 'enrolments',
    name: 'enrolments',
    component: page,
    props: { title: 'Class enrolments' },
    meta: { roles: ['admin', 'lecturer'] },
  },
  {
    path: 'enrolments/:classId',
    name: 'class-roster',
    component: page,
    props: { title: 'Class roster' },
    meta: { roles: ['admin', 'lecturer'] },
  },
  {
    path: 'lecturer/classes/:classId/students',
    name: 'lecturer-class-students',
    component: () => import('./pages/LecturerClassStudentsPage.vue'),
    meta: { roles: ['lecturer'] },
  },
];
