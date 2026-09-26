<script setup lang="ts">
import { ref } from 'vue'
import { useIdentity } from '@/composables/useIdentity'
const name = ref('')
const { busy, error, enter } = useIdentity()
</script>
<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
    <h1 class="page-title">歡迎來到 EchoTrail</h1>
    <p class="page-subtitle">輸入暱稱，開始留下你的職涯事件。</p>
    <form class="flex flex-col gap-3" @submit.prevent="enter(name)">
      <label for="nickname">暱稱</label>
      <input
        id="nickname"
        v-model="name"
        name="nickname"
        type="text"
        maxlength="80"
        autocomplete="nickname"
        class="rounded border border-input bg-background p-3"
        :disabled="busy"
      />
      <button type="submit" class="update-btn" :disabled="busy">
        {{ busy ? '進入中…' : '開始使用' }}
      </button>
    </form>
    <p v-if="error" role="alert" class="text-destructive">{{ error }}</p>
    <p class="text-sm text-muted-foreground">暱稱用於這次展示的資料查找，不是登入驗證。</p>
  </main>
</template>
