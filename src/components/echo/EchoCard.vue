<script setup lang="ts">
import type { TrailEvent } from '@/types/echo'
defineProps<{ event: TrailEvent }>()
</script>
<template>
  <article class="echo-card">
    <h2 class="card-h1">事件 {{ event.id }}：{{ event.title }}（{{ event.date }}）</h2>
    <div class="echo-grid">
      <section class="echo-box">
        <h3>事件的發生</h3>
        <ul>
          <li v-for="(item, i) in event.happen" :key="i">{{ item }}</li>
        </ul>
      </section>
      <section class="echo-box">
        <h3>我的情緒</h3>
        {{ event.emotion }}
      </section>
      <section class="echo-box">
        <h3>✅ 我在意/適合/擅長</h3>
        {{ event.like }}
      </section>
      <section class="echo-box">
        <h3>🚫 我討厭/不適合/不在意</h3>
        {{ event.dislike }}
      </section>
      <section class="echo-box">
        <h3>我的價值主張</h3>
        {{ event.value }}
        <p class="ec-quote">引證原話：「{{ event.quote }}」</p>
      </section>
    </div>
    <slot />
  </article>
</template>
