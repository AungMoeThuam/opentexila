const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
export default [
  {
    path: 'student/attendance',
    name: 'student-attendance',
    component: () => import('./pages/StudentAttendancePage.vue'),
    meta: { roles: ['student'] },
  },
  {
    path: 'student/attendance/class-sessions/:classSessionId',
    name: 'student-class-session-check-in',
    component: () => import('./pages/ClassSessionPage.vue'),
    meta: { roles: ['student'] },
  },
  {
    path: 'attendance',
    name: 'today-classes',
    redirect: { name: 'student-attendance' },
  },
  {
    path: 'attendance/meetings/:meetingId',
    name: 'check-in',
    redirect: (to) => ({
      name: 'student-class-session-check-in',
      params: { classSessionId: to.params.meetingId },
    }),
  },
  {
    path: 'attendance/history',
    name: 'attendance-history',
    component: page,
    props: { title: 'My attendance history' },
    meta: { roles: ['student'] },
  },
  {
    path: 'attendance/classes',
    name: 'class-attendance',
    component: page,
    props: { title: 'Class attendance' },
    meta: { roles: ['teacher', 'admin'] },
  },
  {
    path: 'attendance/sessions/:sessionId',
    name: 'attendance-roster',
    component: page,
    props: { title: 'Meeting attendance roster' },
    meta: { roles: ['teacher', 'admin'] },
  },
];
