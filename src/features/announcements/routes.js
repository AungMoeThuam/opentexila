const feed = () => import('./pages/AnnouncementsPage.vue');
const form = () => import('./pages/AnnouncementFormPage.vue');
const detail = () => import('./pages/AnnouncementDetailPage.vue');

const student = { roles: ['student'] };
const lecturer = { roles: ['lecturer'] };
const admin = { roles: ['admin'] };

// Announcements from all of a user's classes. The feed filters by class with
// ?classId=. Route names and paths are shared with the form and detail issues:
// replace the placeholder pages and keep the names, paths and roles.
export default [
  {
    path: 'student/announcements',
    name: 'student-announcements',
    component: feed,
    meta: student,
  },
  {
    path: 'lecturer/announcements',
    name: 'lecturer-announcements',
    component: feed,
    meta: lecturer,
  },
  {
    path: 'admin/announcements',
    name: 'admin-announcements',
    component: feed,
    meta: admin,
  },
  {
    path: 'lecturer/announcements/new',
    name: 'lecturer-announcement-new',
    component: form,
    meta: lecturer,
  },
  {
    path: 'lecturer/announcements/:announcementId(\\d+)/edit',
    name: 'lecturer-announcement-edit',
    component: form,
    meta: lecturer,
  },
  {
    path: 'student/announcements/:announcementId(\\d+)',
    name: 'student-announcement',
    component: detail,
    meta: student,
  },
  {
    path: 'lecturer/announcements/:announcementId(\\d+)',
    name: 'lecturer-announcement',
    component: detail,
    meta: lecturer,
  },
  {
    path: 'admin/announcements/:announcementId(\\d+)',
    name: 'admin-announcement',
    component: detail,
    meta: admin,
  },
];
