import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('pages/Landing.vue'),
  },
  {
    path: '/resume',
    component: () => import('pages/Index.vue'),
  },
  {
    path: '/resume/download/:format?',
    component: () => import('pages/Download.vue'),
  },
];

export default routes;
