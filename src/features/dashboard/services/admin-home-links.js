// The shortcuts on the admin home page. Paths match the admin routes and the
// sidebar. `icon` is a name from the shared icon set (AppIcon.vue).
export const ADMIN_HOME_LINKS = [
  {
    key: 'courses',
    title: 'Courses',
    to: '/admin/courses',
    icon: 'book',
    action: 'Manage courses',
    description: 'Add and edit the courses of the institution.',
  },
  {
    key: 'classes',
    title: 'Classes',
    to: '/admin/classes',
    icon: 'folder',
    action: 'Manage classes',
    description: 'Set up classes, lecturers and attendance locations.',
  },
  {
    key: 'enrolments',
    title: 'Enrolments',
    to: '/admin/enrolments',
    icon: 'users',
    action: 'Manage enrolments',
    description: 'Enrol students into classes and see each class roster.',
  },
  {
    key: 'attendance',
    title: 'Class attendance',
    to: '/attendance/classes',
    icon: 'check',
    action: 'View attendance',
    description: 'Review attendance for any class session.',
  },
  {
    key: 'accounts',
    title: 'Create account',
    to: '/admin/invitations',
    icon: 'file',
    action: 'Create an account',
    description:
      'Create a student or lecturer account with a temporary password.',
  },
];

// "12 courses", "1 course". Null while the total is not known.
export function countLabel(total, [one, many]) {
  if (!Number.isInteger(total) || total < 0) return null;
  return `${total} ${total === 1 ? one : many}`;
}
