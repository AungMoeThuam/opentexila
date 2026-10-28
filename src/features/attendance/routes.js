const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
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
