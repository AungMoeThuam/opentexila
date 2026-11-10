// Role home pages. Each role has its own page; replace the placeholder
// content in each page and keep the route names and meta.roles.
export default [
  {
    path: 'student/home',
    name: 'student-home',
    component: () => import('./pages/StudentHomePage.vue'),
    meta: { roles: ['student'] },
  },
  {
    path: 'lecturer/home',
    name: 'lecturer-home',
    component: () => import('./pages/LecturerHomePage.vue'),
    meta: { roles: ['lecturer'] },
  },
  {
    path: 'admin/home',
    name: 'admin-home',
    component: () => import('./pages/AdminHomePage.vue'),
    meta: { roles: ['admin'] },
  },
];
