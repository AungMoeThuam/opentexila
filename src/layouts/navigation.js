// UI visibility only. Backend endpoints enforce permissions independently.
const navigation = [
  { label: 'My classes', icon: 'book', to: '/my-classes', roles: ['student'] },
  {
    label: 'Enrolments',
    icon: 'users',
    to: '/enrolments',
    roles: ['admin', 'teacher'],
  },
  {
    label: 'Attendance',
    icon: 'check',
    roles: ['student'],
    children: [
      { label: "Today's classes", to: '/attendance' },
      { label: 'My history', to: '/attendance/history' },
    ],
  },
  {
    label: 'Attendance',
    icon: 'check',
    to: '/lecturer/attendance',
    roles: ['teacher'],
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
