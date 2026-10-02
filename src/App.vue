<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Settings } from '@lucide/vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import NameGate from '@/components/identity/NameGate.vue'

const { user, restore, switchUser } = useIdentity()
const { status } = useEcho()
const router = useRouter()
const route = useRoute()
const mobileUserMenuOpen = ref(false)
const mobileUserMenu = ref<HTMLElement | null>(null)
const dashboardLinks = [
  { to: '/dashboard', label: '總覽' },
  { to: '/dashboard/persona', label: '我的 Persona' },
  { to: '/dashboard/anchor', label: '我的共鳴之錨' },
  { to: '/dashboard/keywords', label: '重複關鍵字' },
  { to: '/dashboard/patterns', label: '行為模式' },
  { to: '/dashboard/north-star', label: '職場北極星' },
]
function closeMobileUserMenu() {
  mobileUserMenuOpen.value = false
}
function handleDocumentClick(event: MouseEvent) {
  if (!mobileUserMenu.value?.contains(event.target as Node)) closeMobileUserMenu()
}
function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMobileUserMenu()
}
onMounted(() => {
  void restore()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
function changeUser() {
  closeMobileUserMenu()
  switchUser()
  void router.push('/')
}
</script>
<template>
  <NameGate v-if="!user" />
  <div v-else class="echo-app">
    <aside class="sidebar" :class="{ 'has-dashboard-subnav': route.path.startsWith('/dashboard') }">
      <RouterLink to="/" class="logo">🤍 EchoTrail</RouterLink>
      <div ref="mobileUserMenu" class="mobile-user-menu">
        <button
          type="button"
          class="mobile-user-menu-trigger"
          aria-label="開啟使用者選單"
          aria-controls="mobile-user-popover"
          :aria-expanded="mobileUserMenuOpen"
          @click="mobileUserMenuOpen = !mobileUserMenuOpen"
        >
          <Settings :size="19" aria-hidden="true" />
        </button>
        <div
          v-if="mobileUserMenuOpen"
          id="mobile-user-popover"
          class="mobile-user-popover"
          aria-label="使用者選單"
        >
          <span class="mobile-user-name">{{ user.name }}</span>
          <button type="button" :disabled="status.busy" @click="changeUser">切換使用者</button>
        </div>
      </div>
      <nav aria-label="主要導覽">
        <RouterLink to="/" class="new-btn">＋ New</RouterLink>
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
