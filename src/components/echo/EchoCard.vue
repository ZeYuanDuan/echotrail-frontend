<script setup lang="ts">
import type { TrailEvent } from '@/mocks/echo'
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
      <section class="echo-box">
        <h3>{{ event.isNew ? '這次，多了一些新發現' : '與 My Dashboard 的關聯' }}</h3>
        <div v-if="event.isNew" class="donut-box">
          <div class="insight-donut" role="img" aria-label="核心特質 80%，新發現 20%"></div>
          <div>
            <div class="chip chip-yellow">方法導向判斷</div>
            <div class="chip chip-green">被市場消息牽動節奏</div>
          </div>
        </div>
        <p v-else>此事件已計入你的 My Dashboard 分析結果中。</p>
      </section>
    </div>
    <slot />
  </article>
</template>
