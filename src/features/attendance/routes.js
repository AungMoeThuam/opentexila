const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
const AttendanceHistoryPage = () => import('./pages/AttendanceHistoryPage.vue');

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
