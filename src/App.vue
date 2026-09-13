<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
const { updated, status, newChat, reset } = useEcho()
const router = useRouter()
const resetDialog = ref<HTMLDialogElement | null>(null)
function start() {
  newChat()
  void router.push('/')
}
function resetDemo() {
  reset()
  resetDialog.value?.close()
  void router.push('/')
}
</script>
<template>
  <div class="echo-app" :class="{ updated }">
    <aside class="sidebar">
      <RouterLink to="/" class="logo">🤍 EchoTrail</RouterLink>
      <nav aria-label="主要導覽">
        <button class="new-btn" :disabled="status.busy" @click="start">＋ New</button
        ><RouterLink to="/trail" class="nav-item" active-class="active">🧭 My Trail</RouterLink
        ><RouterLink to="/dashboard" class="nav-item" active-class="active"
          >📊 My Dashboard</RouterLink
        >
      </nav>
      <div class="sidebar-footer">
        <span class="demo-label">DEMO · 假資料版本</span
        ><button :disabled="status.busy" @click="resetDialog?.showModal()">重設示範資料</button>
      </div>
    </aside>
    <main class="main">
      <p v-if="status.storageError" role="alert" class="storage-warning">
        瀏覽器無法儲存資料，目前仍可操作，重新整理後可能不會保留。
      </p>
      <RouterView />
    </main>
    <dialog ref="resetDialog" class="details-dialog reset-dialog" aria-labelledby="reset-title">
      <h2 id="reset-title">重新開始示範？</h2>
      <p>會清除這個瀏覽器新增的對話與 Echo Card，恢復原本的六筆示範事件。</p>
      <div class="dialog-actions">
        <button class="toggle-btn" @click="resetDialog?.close()">取消</button
        ><button class="update-btn" @click="resetDemo">重設資料</button>
      </div>
    </dialog>
  </div>
</template>
