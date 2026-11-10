// UI visibility only. Backend endpoints enforce permissions independently.
const navigation = [
  { label: 'Home', icon: 'home', to: '/student/home', roles: ['student'] },
  { label: 'Home', icon: 'home', to: '/lecturer/home', roles: ['lecturer'] },
  { label: 'Home', icon: 'home', to: '/admin/home', roles: ['admin'] },
  {
    label: 'My classes',
    icon: 'book',
    to: '/lecturer/classes',
    roles: ['lecturer'],
  },
  { label: 'My classes', icon: 'book', to: '/my-classes', roles: ['student'] },
  { label: 'Courses', icon: 'book', to: '/admin/courses', roles: ['admin'] },
  { label: 'Classes', icon: 'folder', to: '/admin/classes', roles: ['admin'] },
  {
    label: 'Enrolments',
    icon: 'users',
    to: '/admin/enrolments',
    roles: ['admin'],
  },
  {
    label: 'Attendance',
    icon: 'check',
    roles: ['student'],
    children: [
      { label: 'Scheduled classes', to: '/student/attendance' },
      { label: 'My history', to: '/attendance/history' },
    ],
  },
  {
    label: 'Attendance',
    icon: 'check',
    to: '/lecturer/attendance',
    roles: ['lecturer'],
  },
  {
    label: 'Class attendance',
    icon: 'check',
    to: '/attendance/classes',
    roles: ['admin'],
  },
  {
    label: 'Create account',
    icon: 'users',
    to: '/admin/invitations',
    roles: ['admin'],
  },
];
export function navigationForRole(role) {
  return navigation.filter((item) => item.roles.includes(role));
}
