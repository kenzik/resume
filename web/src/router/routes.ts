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
];

export default routes;
