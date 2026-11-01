const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
const AttendanceHistoryPage = () => import('./pages/AttendanceHistoryPage.vue');

export default [
  {
    path: 'attendance',
    name: 'today-classes',
    component: page,
    props: { title: "Today's classes" },
    meta: { roles: ['student'] },
  },
  {
    path: 'attendance/meetings/:meetingId',
    name: 'check-in',
    component: page,
    props: { title: 'Class check-in' },
    meta: { roles: ['student'] },
  },
  {
    path: 'attendance/history',
    name: 'attendance-history',
    component: AttendanceHistoryPage,
    meta: { roles: ['student'] },
  },
  {
    path: 'student/attendance/history',
    name: 'student-attendance-history',
    component: AttendanceHistoryPage,
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
