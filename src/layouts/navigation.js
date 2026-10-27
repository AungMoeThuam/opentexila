// Sidebar items for AppLayout. Add or rename entries in one shared PR.
// `icon` must exist in src/shared/components/AppIcon.vue.
// A group has `children` instead of `to`. Role-based filtering arrives with authentication.
export default [
  { label: 'Dashboard', icon: 'home', to: '/dashboard' },
  { label: 'Classrooms', icon: 'book', to: '/classrooms' },
  {
    label: 'Attendance',
    icon: 'check',
    children: [
      { label: "Today's classes", to: '/attendance' },
      { label: 'History', to: '/attendance/history' },
    ],
  },
  { label: 'Assignments', icon: 'file', to: '/assignments' },
  { label: 'Resources', icon: 'folder', to: '/resources' },
  { label: 'Announcements', icon: 'bell', to: '/announcements' },
  { label: 'Users', icon: 'users', to: '/users' },
];
