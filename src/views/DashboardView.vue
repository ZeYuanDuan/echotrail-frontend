<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CareerAnchorRadar from '@/components/dashboard/CareerAnchorRadar.vue'
import { Button } from '@/components/ui/button'
import { SelectionButton } from '@/components/ui/selection-button'
import { useEcho } from '@/composables/useEcho'
import type { InsightFramework } from '@/types/echo'

const route = useRoute()
const { allEvents } = useEcho()
const selectedFramework = ref<InsightFramework>('riasec')
const section = computed(() => String(route.params.section ?? 'overview'))

const frameworkMeta: Record<
  InsightFramework,
  { title: string; description: string; dimensions: Record<string, string> }
> = {
  riasec: {
    title: 'RIASEC 工作興趣',
    description: '從事件裡反覆出現的工作偏好，觀察你傾向投入哪類問題。',
    dimensions: { R: '實作', I: '研究', A: '創意', S: '助人', E: '推動', C: '組織' },
  },
  disc: {
    title: 'DISC 行動風格',
    description: '不是性格測驗結果，而是你在這些事件中展現的互動與決策傾向。',
    dimensions: { D: '主導', I: '影響', S: '穩定', C: '謹慎' },
  },
  schein: {
    title: '職涯錨點',
    description: '從你不願妥協的判斷中，找出目前最清楚的職涯驅動力。',
    dimensions: {
      technical: '專業能力',
      managerial: '管理整合',
      autonomy: '自主獨立',
      security: '安全穩定',
      entrepreneurial: '創業創新',
      service: '服務使命',
      challenge: '純粹挑戰',
      lifestyle: '生活整合',
    },
  },
}

const analyzedEvents = computed(() => allEvents.value)
const latestEvent = computed(() => analyzedEvents.value[analyzedEvents.value.length - 1])
const profile = computed(() => latestEvent.value?.dashboard ?? null)
const dashboardProfiles = computed(() => analyzedEvents.value.map((event) => event.dashboard))
const anchorSummary = computed(() => {
  const unique = (items: string[]) => [...new Set(items)].slice(0, 3)
  const primaryCounts = new Map<string, number>()
  dashboardProfiles.value.forEach((current) => {
    primaryCounts.set(current.anchor.primary, (primaryCounts.get(current.anchor.primary) ?? 0) + 1)
  })
  const primary = [...primaryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  return {
    primary,
    ability: unique(dashboardProfiles.value.flatMap((current) => current.anchor.ability)),
    motivation: unique(dashboardProfiles.value.flatMap((current) => current.anchor.motivation)),
    values: unique(dashboardProfiles.value.flatMap((current) => current.anchor.values)),
  }
})
const signals = computed(() => analyzedEvents.value.flatMap((event) => event.signals ?? []))

const keywords = computed(() => {
  const totals = new Map<string, number>()
  analyzedEvents.value.forEach((event) => {
    const current = event.dashboard
    current.keywords.forEach((keyword) => {
      totals.set(keyword.text, (totals.get(keyword.text) ?? 0) + keyword.weight)
    })
  })
  const maximum = Math.max(1, ...totals.values())
  return [...totals.entries()]
    .map(([text, weight]) => ({ text, weight: Math.max(1, Math.round((weight / maximum) * 5)) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12)
})
const patterns = computed(() => {
  const seen = new Set<string>()
  return analyzedEvents.value
    .flatMap((event) => event.dashboard.patterns)
    .filter((pattern) => {
      if (seen.has(pattern.title)) return false
      seen.add(pattern.title)
      return true
    })
    .slice(0, 5)
})

const chartRows = computed(() => {
  const framework = selectedFramework.value
  return Object.entries(frameworkMeta[framework].dimensions).map(([dimension, label]) => {
    const matching = signals.value.filter(
      (signal) => signal.framework === framework && signal.dimension === dimension,
    )
    const score = matching.length
      ? Math.round(
          (matching.reduce((sum, signal) => sum + signal.strength, 0) / matching.length) * 10,
        )
      : 0
    return { dimension, label, score }
  })
})
const strongest = computed(() => [...chartRows.value].sort((a, b) => b.score - a.score)[0])
const selectedSignals = computed(() =>
  analyzedEvents.value.flatMap((event) =>
    (event.signals ?? [])
      .filter((signal) => signal.framework === selectedFramework.value)
      .map((signal) => ({ ...signal, eventTitle: event.title })),
  ),
)
const discPosition = computed(() => {
  const score = (dimension: string) =>
    chartRows.value.find((row) => row.dimension === dimension)?.score ?? 0
  const clamp = (value: number) => Math.min(88, Math.max(12, value))
  return {
    left: `${clamp(50 + (score('D') - score('S')) * 0.38)}%`,
    top: `${clamp(50 + (score('C') - score('I')) * 0.38)}%`,
  }
})

const northStarAxes = computed(() => {
  const labels = Object.entries(frameworkMeta.schein.dimensions)
  return labels.map(([dimension, label]) => {
    const matching = signals.value.filter(
      (signal) => signal.framework === 'schein' && signal.dimension === dimension,
    )
    return {
      label,
      score: matching.length
        ? Math.round(
            (matching.reduce((sum, signal) => sum + signal.strength, 0) / matching.length) * 10,
          )
        : 0,
    }
  })
})
</script>

<template>
  <main class="dashboard-content generated-dashboard">
    <header class="dashboard-hero">
      <div>
        <h1 class="h1">{{ section === 'overview' ? 'My Dashboard' : '你的職涯洞察' }}</h1>
        <p>
          {{
            section === 'overview'
              ? '從對話裡看見你的能力、動機、價值標準與不變的職涯追求。'
              : '每一項分析都保留和事件及原句之間的連結。'
          }}
        </p>
      </div>
      <div class="signal-count" aria-label="已分析事件數">
        <strong>{{ analyzedEvents.length }}</strong
        ><span>筆對話事件</span>
      </div>
    </header>

    <section v-if="!latestEvent || !profile" class="dashboard-empty">
      <div class="empty-orbit" aria-hidden="true"></div>
      <h2>第一個洞察還在等你</h2>
      <p>完成一段 Gemini 對話、產生 Echo Card，再按「更新至 Dashboard」。</p>
      <div class="mt-6">
        <Button as-child variant="echo" size="lg">
          <RouterLink to="/">回到對話</RouterLink>
        </Button>
      </div>
    </section>

    <template v-else>
      <div v-if="section === 'overview'" class="dashboard-overview">
        <RouterLink to="/dashboard/persona" class="overview-card persona-overview">
          <div class="overview-heading">
            <h2>我的 Persona</h2>
            <span>查看完整輪廓</span>
          </div>
          <p class="persona-headline">{{ profile.persona.headline }}</p>
          <ul>
            <li v-for="item in profile.persona.summaries" :key="item">{{ item }}</li>
          </ul>
          <blockquote>「{{ profile.persona.quote }}」</blockquote>
        </RouterLink>

        <RouterLink to="/dashboard/anchor" class="overview-card anchor-overview">
          <div class="overview-heading">
            <h2>我的共鳴之錨</h2>
            <span>查看三個基礎</span>
          </div>
          <div class="venn" aria-label="能力、動機與價值的交集">
            <div class="venn-circle ability">
              <strong>我擅長什麼？</strong>
              <ul>
                <li v-for="item in anchorSummary.ability" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="venn-circle motivation">
              <strong>我想要什麼？</strong>
              <ul>
                <li v-for="item in anchorSummary.motivation" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="venn-circle values">
              <strong>我的標準是什麼？</strong>
              <ul>
                <li v-for="item in anchorSummary.values" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="venn-center">
              <strong>⚓ {{ anchorSummary.primary }}</strong
              ><small>你的核心職涯錨定</small>
            </div>
          </div>
        </RouterLink>

        <RouterLink to="/dashboard/keywords" class="overview-card keywords-overview">
          <div class="overview-heading">
            <h2>重複關鍵字排行榜</h2>
            <span>查看來源</span>
          </div>
          <div class="word-field">
            <span
              v-for="keyword in keywords"
              :key="keyword.text"
              :style="{ fontSize: `${13 + keyword.weight * 4}px` }"
              >{{ keyword.text }}</span
            >
          </div>
        </RouterLink>

        <RouterLink to="/dashboard/patterns" class="overview-card patterns-overview">
          <div class="overview-heading">
            <h2>行為模式排行榜</h2>
            <span>查看證據</span>
          </div>
          <ol class="pattern-ranking">
            <li v-for="(pattern, index) in patterns.slice(0, 3)" :key="pattern.title">
              <span>{{ index + 1 }}</span>
              <p>{{ pattern.title }}</p>
            </li>
          </ol>
        </RouterLink>

        <RouterLink to="/dashboard/north-star" class="overview-card north-star-overview">
          <CareerAnchorRadar :axes="northStarAxes" compact />
          <div>
            <div class="overview-heading">
              <h2>找到我的職場北極星</h2>
              <span>查看完整指引</span>
            </div>
            <p class="north-star-kicker">主要職涯錨定：{{ profile.northStar.primaryAnchor }}</p>
            <h3>{{ profile.northStar.tagline }}</h3>
            <p>{{ profile.northStar.bottomLine }}</p>
          </div>
        </RouterLink>
      </div>

      <section v-else-if="section === 'persona'" class="dashboard-detail persona-detail">
        <RouterLink to="/dashboard" class="back-link">回到總覽</RouterLink>
        <h2>我的 Persona</h2>
        <p class="detail-lead">{{ profile.persona.headline }}</p>
        <div class="persona-notes">
          <article v-for="item in profile.persona.summaries" :key="item">{{ item }}</article>
        </div>
        <blockquote>代表句子：「{{ profile.persona.quote }}」</blockquote>
      </section>

      <section v-else-if="section === 'anchor'" class="dashboard-detail anchor-detail">
        <RouterLink to="/dashboard" class="back-link">回到總覽</RouterLink>
        <h2>我的共鳴之錨</h2>
        <p class="detail-lead">
          所有事件中的三種視角交集，形成目前最清楚的「{{ anchorSummary.primary }}」。
        </p>
        <div class="anchor-foundations">
          <article>
            <h3>我擅長什麼？</h3>
            <ul>
              <li v-for="item in anchorSummary.ability" :key="item">{{ item }}</li>
            </ul>
          </article>
          <article>
            <h3>我想要什麼？</h3>
            <ul>
              <li v-for="item in anchorSummary.motivation" :key="item">{{ item }}</li>
            </ul>
          </article>
          <article>
            <h3>我的標準是什麼？</h3>
            <ul>
              <li v-for="item in anchorSummary.values" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </section>

      <section v-else-if="section === 'keywords'" class="dashboard-detail keyword-detail">
        <RouterLink to="/dashboard" class="back-link">回到總覽</RouterLink>
        <h2>重複關鍵字排行榜</h2>
        <p class="detail-lead">字越大，代表它在已整理的事件裡越常成為重要線索。</p>
        <div class="word-field large">
          <span
            v-for="keyword in keywords"
            :key="keyword.text"
            :style="{ fontSize: `${18 + keyword.weight * 7}px` }"
            >{{ keyword.text }}</span
          >
        </div>
      </section>

      <section v-else-if="section === 'patterns'" class="dashboard-detail pattern-detail">
        <RouterLink to="/dashboard" class="back-link">回到總覽</RouterLink>
        <h2>行為模式排行榜</h2>
        <p class="detail-lead">從不同事件裡辨認你反覆採取的判斷與行動。</p>
        <ol class="pattern-ledger">
          <li v-for="(pattern, index) in patterns" :key="pattern.title">
            <strong>{{ index + 1 }}</strong>
            <div>
              <h3>{{ pattern.title }}</h3>
              <blockquote>「{{ pattern.evidenceQuote }}」</blockquote>
            </div>
          </li>
        </ol>
      </section>

      <section v-else-if="section === 'north-star'" class="dashboard-detail north-star-detail">
        <RouterLink to="/dashboard" class="back-link">回到總覽</RouterLink>
        <h2>找到我的職場北極星</h2>
        <p class="detail-lead">職涯錨定如何指引內心不變的追求</p>
        <div class="north-star-layout">
          <CareerAnchorRadar :axes="northStarAxes" />
          <div class="north-star-copy">
            <p class="north-star-kicker">⚓ 主要職涯錨定：{{ profile.northStar.primaryAnchor }}</p>
            <h3>💡 {{ profile.northStar.tagline }}</h3>
            <h4>想在乎／想要的事</h4>
            <ul>
              <li v-for="item in profile.northStar.desires" :key="item">{{ item }}</li>
            </ul>
            <h4>絕對不妥協的底線</h4>
            <p>{{ profile.northStar.bottomLine }}</p>
            <h4>下一步職涯指引</h4>
            <ul>
              <li v-for="item in profile.northStar.nextSteps" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <template v-else>
        <nav class="framework-tabs" aria-label="選擇分析框架">
          <SelectionButton
            v-for="(meta, framework) in frameworkMeta"
            :key="framework"
            :selected="selectedFramework === framework"
            @click="selectedFramework = framework"
          >
            {{ meta.title }}
          </SelectionButton>
        </nav>
        <section class="framework-stage" :aria-labelledby="`${selectedFramework}-title`">
          <div class="chart-panel">
            <header>
              <div>
                <h2 :id="`${selectedFramework}-title`">
                  {{ frameworkMeta[selectedFramework].title }}
                </h2>
                <p>{{ frameworkMeta[selectedFramework].description }}</p>
              </div>
              <div v-if="strongest?.score" class="strongest-signal">
                <span>目前最強訊號</span
                ><strong>{{ strongest.label }} {{ strongest.score }}</strong>
              </div>
            </header>
            <div v-if="selectedFramework === 'disc'" class="disc-map" aria-label="DISC 象限圖">
              <span class="disc-axis disc-axis-top">影響</span
              ><span class="disc-axis disc-axis-right">主導</span
              ><span class="disc-axis disc-axis-bottom">謹慎</span
              ><span class="disc-axis disc-axis-left">穩定</span>
              <div class="disc-center-line horizontal"></div>
              <div class="disc-center-line vertical"></div>
              <div class="disc-position" :style="discPosition"><span>你</span></div>
            </div>
            <div class="signal-bars">
              <div v-for="row in chartRows" :key="row.dimension" class="signal-row">
                <div class="signal-label">
                  <strong>{{ row.dimension }}</strong
                  ><span>{{ row.label }}</span>
                </div>
                <div class="signal-track" :aria-label="`${row.label} ${row.score} 分`">
                  <div class="signal-fill" :style="{ width: `${row.score}%` }"></div>
                </div>
                <span class="signal-score">{{ row.score || '—' }}</span>
              </div>
            </div>
            <p v-if="analyzedEvents.length < 3" class="unlock-note">
              目前是 {{ analyzedEvents.length }}/3 筆的前置預覽；累積三筆後再作為穩定趨勢解讀。
            </p>
          </div>
          <aside class="evidence-ledger">
            <h2>分數從哪裡來</h2>
            <p>訊號只新增、不覆寫；每筆都保留事件與逐字原句。</p>
            <div v-if="selectedSignals.length" class="evidence-listing">
              <article
                v-for="(signal, index) in selectedSignals"
                :key="`${signal.eventTitle}-${index}`"
              >
                <div>
                  <span>{{ frameworkMeta[selectedFramework].dimensions[signal.dimension] }}</span
                  ><strong>+{{ signal.strength }}</strong>
                </div>
                <blockquote>「{{ signal.evidenceQuote }}」</blockquote>
                <small>{{ signal.eventTitle }}</small>
              </article>
            </div>
            <p v-else class="no-evidence">這次對話沒有足夠原句支撐此框架，因此沒有硬湊分數。</p>
          </aside>
        </section>
      </template>
    </template>
  </main>
</template>
