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
    component: () => import('./pages/AdminClassAttendancePage.vue'),
    meta: { roles: ['admin'] },
  },
  {
    path: 'attendance/class-sessions/:classSessionId(\\d+)',
    name: 'admin-class-session-records',
    component: () => import('./pages/AdminClassSessionRecordsPage.vue'),
    meta: { roles: ['admin'] },
  },
  {
    path: 'lecturer/attendance',
    name: 'lecturer-attendance',
    component: () => import('./pages/LecturerAttendancePage.vue'),
    meta: { roles: ['lecturer'] },
  },
  {
    path: 'lecturer/analytics',
    name: 'lecturer-analytics',
    component: () => import('./pages/LecturerAnalyticsPage.vue'),
    meta: { roles: ['lecturer'] },
  },
  {
    path: 'lecturer/class-sessions/:classSessionId',
    name: 'lecturer-class-session-records',
    component: () => import('./pages/LecturerClassSessionRecordsPage.vue'),
    meta: { roles: ['lecturer'] },
  },
];
