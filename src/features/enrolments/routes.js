const page = () => import('../../shared/pages/FeaturePlaceholder.vue');
export default [
  {
    path: 'my-classes',
    name: 'my-classes',
    component: page,
    props: { title: 'My classes' },
    meta: { roles: ['student'] },
  },
  {
    path: 'enrolments',
    name: 'enrolments',
    component: page,
    props: { title: 'Class enrolments' },
    meta: { roles: ['admin', 'teacher'] },
  },
  {
    path: 'enrolments/:classId',
    name: 'class-roster',
    component: page,
    props: { title: 'Class roster' },
    meta: { roles: ['admin', 'teacher'] },
  },
];
