const admin = { roles: ['admin'] };

export default [
  {
    path: 'admin/timetable',
    name: 'admin-timetable',
    component: () => import('./pages/AdminTimetablePage.vue'),
    meta: admin,
  },
];
