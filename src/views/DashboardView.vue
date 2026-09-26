<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CareerAnchorRadar from '@/components/dashboard/CareerAnchorRadar.vue'
import { useDashboard } from '@/composables/useDashboard'
import { useIdentity } from '@/composables/useIdentity'
import type { InsightFramework } from '@/types/echo'

const route = useRoute()
const { user } = useIdentity()
const { snapshot, busy, error, load } = useDashboard()
const selectedFramework = ref<InsightFramework>('riasec')
const section = computed(() => String(route.params.section ?? 'overview'))
onMounted(() => {
  if (user.value) void load(user.value.id)
})
function retry() {
  if (user.value) void load(user.value.id)
}
const profile = computed(() => snapshot.value?.profile ?? null)
const anchorSummary = computed(
  () => profile.value?.anchor ?? { primary: '', ability: [], motivation: [], values: [] },
)
const keywords = computed(() => profile.value?.keywords ?? [])
const patterns = computed(() => profile.value?.patterns ?? [])
const frameworkMeta: Record<
  InsightFramework,
  { title: string; description: string; dimensions: Record<string, string> }
> = {
  riasec: {
    title: 'RIASEC 工作興趣',
    description: '事件訊號預覽：從已確認事件觀察工作偏好。',
    dimensions: { R: '實作', I: '研究', A: '創意', S: '助人', E: '推動', C: '組織' },
  },
  disc: {
    title: 'DISC 行動風格',
    description: '事件訊號預覽：從已確認事件觀察互動與決策傾向。',
    dimensions: { D: '主導', I: '影響', S: '穩定', C: '謹慎' },
  },
  schein: {
    title: '職涯錨點',
    description: '事件訊號預覽：從已確認事件觀察職涯驅動力。',
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
const chartRows = computed(() =>
  Object.entries(frameworkMeta[selectedFramework.value].dimensions).map(([dimension, label]) => ({
    dimension,
    label,
    score: snapshot.value?.frameworks.scores[selectedFramework.value][dimension] ?? 0,
  })),
)
const strongest = computed(() => [...chartRows.value].sort((a, b) => b.score - a.score)[0])
const selectedSignals = computed(
  () =>
    snapshot.value?.frameworks.evidence.filter(
      (signal) => signal.framework === selectedFramework.value,
    ) ?? [],
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
const northStarAxes = computed(() =>
  Object.entries(frameworkMeta.schein.dimensions).map(([dimension, label]) => ({
    label,
    score: snapshot.value?.frameworks.scores.schein[dimension] ?? 0,
  })),
)
</script>

<template>
  <main class="dashboard-content generated-dashboard">
    <header class="dashboard-hero">
      <div>
        <h1 class="page-title">
          {{ section === 'overview' ? 'My Dashboard' : '你的職涯洞察' }}
        </h1>
        <p class="page-subtitle">
          {{
            section === 'overview'
              ? '從對話裡看見你的能力、動機、價值標準與不變的職涯追求。'
              : '每一項分析都保留和事件及原句之間的連結。'
          }}
        </p>
      </div>
      <div class="signal-count" aria-label="已分析事件數">
        <strong>{{ snapshot?.sourceEventCount ?? 0 }}</strong
        ><span>筆對話事件</span>
      </div>
    </header>

    <div v-if="busy" role="status">正在讀取 Dashboard…</div>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <button class="update-btn" @click="retry">重試</button>
    </div>
    <section v-else-if="!snapshot || !profile" class="dashboard-empty">
      <div class="empty-orbit" aria-hidden="true"></div>
      <h2>第一個洞察還在等你</h2>
      <p>完成一段 Gemini 對話並確認 Echo Card，系統就會自動更新這裡。</p>
      <RouterLink to="/" class="dashboard-link">回到對話</RouterLink>
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
        <p class="text-muted-foreground">
          已保存版本 · {{ snapshot.sourceEventCount }} 筆事件 ·
          {{ new Date(snapshot.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) }}
        </p>
        <nav class="framework-tabs" aria-label="選擇分析框架">
          <button
            v-for="(meta, framework) in frameworkMeta"
            :key="framework"
            type="button"
            :class="{ active: selectedFramework === framework }"
            :aria-pressed="selectedFramework === framework"
            @click="selectedFramework = framework"
          >
            {{ meta.title }}
          </button>
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
            <p v-if="snapshot && snapshot.sourceEventCount < 3" class="unlock-note">
              目前是 {{ snapshot?.sourceEventCount ?? 0 }}/3
              筆的前置預覽；累積三筆後再作為穩定趨勢解讀。
            </p>
          </div>
          <aside class="evidence-ledger">
            <h2>事件訊號預覽 · 分數從哪裡來</h2>
            <p>訊號只新增、不覆寫；每筆都保留事件與逐字原句。</p>
            <div v-if="selectedSignals.length" class="evidence-listing">
              <article
                v-for="signal in selectedSignals"
                :key="`${signal.eventId}-${signal.framework}-${signal.dimension}-${signal.evidenceQuote}`"
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
