// The shortcuts on the admin home page. `count` names the total that is shown
// on the card when it is known. Paths match the admin routes and the sidebar.
export const ADMIN_HOME_LINKS = [
  {
    key: 'courses',
    title: 'Courses',
    to: '/admin/courses',
    description: 'Add and edit the courses of the institution.',
    count: ['course', 'courses'],
  },
  {
    key: 'classes',
    title: 'Classes',
    to: '/admin/classes',
    description: 'Set up classes, lecturers and attendance locations.',
    count: ['class', 'classes'],
  },
  {
    key: 'enrolments',
    title: 'Enrolments',
    to: '/admin/enrolments',
    description: 'Enrol students into classes and see each class roster.',
  },
  {
    key: 'attendance',
    title: 'Class attendance',
    to: '/attendance/classes',
    description: 'Review attendance for any class session.',
  },
  {
    key: 'accounts',
    title: 'Create account',
    to: '/admin/invitations',
    description:
      'Create a student or lecturer account with a temporary password.',
  },
];

// "12 courses", "1 course". Null while the total is not known.
export function countLabel(total, [one, many]) {
  if (!Number.isInteger(total) || total < 0) return null;
  return `${total} ${total === 1 ? one : many}`;
}
