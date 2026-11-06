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
    path: 'my-classes',
    name: 'my-classes',
    component: StudentClassesPage,
    meta: { roles: ['student'] },
  },
  {
    path: 'enrolments',
    name: 'enrolments',
    component: page,
    props: { title: 'Class enrolments' },
    meta: { roles: ['admin', 'teacher'] },
  },
  {
    path: 'enrolments/:classId',
    name: 'class-roster',
    component: page,
    props: { title: 'Class roster' },
    meta: { roles: ['admin', 'teacher'] },
  },
  {
    path: 'lecturer/classes/:classId/students',
    name: 'lecturer-class-students',
    component: () => import('./pages/LecturerClassStudentsPage.vue'),
    meta: { roles: ['teacher'] },
  },
];
