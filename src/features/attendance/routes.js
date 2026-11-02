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
    meta: { roles: ['admin'] },
  },
  {
    path: 'lecturer/attendance',
    name: 'lecturer-attendance',
    component: () => import('./pages/LecturerAttendancePage.vue'),
    meta: { roles: ['teacher'] },
  },
  {
    path: 'lecturer/class-sessions/:classSessionId',
    name: 'lecturer-class-session-records',
    component: () => import('./pages/LecturerClassSessionRecordsPage.vue'),
    meta: { roles: ['teacher'] },
  },
];
