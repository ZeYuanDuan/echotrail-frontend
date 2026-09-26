import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/trail', name: 'trail', component: () => import('@/views/TrailView.vue') },
  { path: '/dashboard/frameworks', redirect: '/dashboard' },
  {
    path: '/dashboard/:section?',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
