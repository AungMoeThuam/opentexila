// UI visibility only. Backend endpoints enforce permissions independently.
const navigation = [
  {
    label: 'My classes',
    icon: 'book',
    to: '/lecturer/classes',
    roles: ['lecturer'],
  },
  { label: 'My classes', icon: 'book', to: '/my-classes', roles: ['student'] },
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
    label: 'Account invitations',
    icon: 'users',
    to: '/admin/invitations',
    roles: ['admin'],
  },
];
export function navigationForRole(role) {
  return navigation.filter((item) => item.roles.includes(role));
}
