<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import NameGate from '@/components/identity/NameGate.vue'

const { user, restore, switchUser } = useIdentity()
const { status, newChat } = useEcho()
const router = useRouter()
const route = useRoute()
const dashboardLinks = [
  { to: '/dashboard', label: '總覽' },
  { to: '/dashboard/persona', label: '我的 Persona' },
  { to: '/dashboard/anchor', label: '我的共鳴之錨' },
  { to: '/dashboard/keywords', label: '重複關鍵字' },
  { to: '/dashboard/patterns', label: '行為模式' },
  { to: '/dashboard/north-star', label: '職場北極星' },
]
onMounted(() => {
  void restore()
})
function start() {
  newChat()
  void router.push('/')
}
function changeUser() {
  switchUser()
  void router.push('/')
}
</script>
<template>
  <NameGate v-if="!user" />
  <div v-else class="echo-app">
    <aside class="sidebar">
      <RouterLink to="/" class="logo">🤍 EchoTrail</RouterLink>
      <nav aria-label="主要導覽">
        <button class="new-btn" :disabled="status.busy" @click="start">＋ New</button>
        <RouterLink to="/trail" class="nav-item" active-class="active">🧭 My Trail</RouterLink>
        <RouterLink
          to="/dashboard"
          class="nav-item"
          :class="{ active: route.path.startsWith('/dashboard') }"
          >📊 My Dashboard</RouterLink
        >
        <div v-if="route.path.startsWith('/dashboard')" class="dashboard-subnav">
          <RouterLink
            v-for="link in dashboardLinks"
            :key="link.to"
            :to="link.to"
            :class="{ active: route.path === link.to }"
            >{{ link.label }}</RouterLink
          >
        </div>
      </nav>
      <div class="sidebar-footer">
        <span>{{ user.name }}</span>
        <button :disabled="status.busy" @click="changeUser">切換使用者</button>
      </div>
    </aside>
    <main class="main"><RouterView /></main>
  </div>
</template>
