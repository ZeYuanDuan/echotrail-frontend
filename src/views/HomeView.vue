<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
    <p class="text-sm font-medium tracking-widest text-muted-foreground">ECHOTRAIL</p>
    <h1 class="text-4xl font-semibold tracking-tight">前端環境已就緒</h1>
    <p class="text-muted-foreground">接下來將依確認的產品流程加入假資料介面。</p>
    <Button class="w-fit" as-child>
      <a href="https://vuejs.org/guide/introduction.html" target="_blank" rel="noopener noreferrer">
        Vue 開發文件
      </a>
    </Button>
  </main>
</template>
