<script setup lang="ts">
import type { DashboardProfile } from '@/types/echo'

defineProps<{ anchor: DashboardProfile['anchor'] }>()
</script>

<template>
  <div class="venn" aria-label="能力、動機與價值的交集">
    <div class="venn-circle ability">
      <strong>我擅長什麼？</strong>
      <ul>
        <li v-for="item in anchor.ability" :key="item">{{ item }}</li>
      </ul>
    </div>
    <div class="venn-circle motivation">
      <strong>我想要什麼？</strong>
      <ul>
        <li v-for="item in anchor.motivation" :key="item">{{ item }}</li>
      </ul>
    </div>
    <div class="venn-circle values">
      <strong>我的標準是什麼？</strong>
      <ul>
        <li v-for="item in anchor.values" :key="item">{{ item }}</li>
      </ul>
    </div>
    <div class="venn-center">
      <strong>⚓ {{ anchor.primary }}</strong>
      <small>你的核心職涯錨定</small>
    </div>
  </div>
</template>
