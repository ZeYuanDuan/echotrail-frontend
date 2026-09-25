<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
const { status, newChat, reset } = useEcho()
const router = useRouter()
const route = useRoute()
const resetDialog = ref<HTMLDialogElement | null>(null)
const dashboardLinks = [
  { to: '/dashboard', label: '總覽' },
  { to: '/dashboard/persona', label: '我的 Persona' },
  { to: '/dashboard/anchor', label: '我的共鳴之錨' },
  { to: '/dashboard/keywords', label: '重複關鍵字' },
  { to: '/dashboard/patterns', label: '行為模式' },
  { to: '/dashboard/north-star', label: '職場北極星' },
  { to: '/dashboard/frameworks', label: '分析框架' },
]
function start() {
  newChat()
  void router.push('/')
}
function clearData() {
  reset()
  resetDialog.value?.close()
  void router.push('/')
}
</script>
<template>
  <div class="echo-app">
    <aside class="sidebar">
      <RouterLink to="/" class="logo">🤍 EchoTrail</RouterLink>
      <nav aria-label="主要導覽">
        <button class="new-btn" :disabled="status.busy" @click="start">＋ New</button
        ><RouterLink to="/trail" class="nav-item" active-class="active">🧭 My Trail</RouterLink
        ><RouterLink
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
          >
            {{ link.label }}
          </RouterLink>
        </div>
      </nav>
      <div class="sidebar-footer">
        <button :disabled="status.busy" @click="resetDialog?.showModal()">清除所有資料</button>
      </div>
    </aside>
    <main class="main">
      <p v-if="status.storageError" role="alert" class="storage-warning">
        瀏覽器無法儲存資料，目前仍可操作，重新整理後可能不會保留。
      </p>
      <RouterView />
    </main>
    <dialog ref="resetDialog" class="details-dialog reset-dialog" aria-labelledby="reset-title">
      <h2 id="reset-title">清除所有資料？</h2>
      <p>會清除這個瀏覽器儲存的對話與 Echo Card，且無法復原。</p>
      <div class="dialog-actions">
        <button class="toggle-btn" @click="resetDialog?.close()">取消</button
        ><button class="update-btn" @click="clearData">確認清除</button>
      </div>
    </dialog>
  </div>
</template>
