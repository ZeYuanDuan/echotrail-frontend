<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CareerAnchorRadar from '@/components/dashboard/CareerAnchorRadar.vue'
import { useDashboard } from '@/composables/useDashboard'
import { useIdentity } from '@/composables/useIdentity'

const route = useRoute()
const { user } = useIdentity()
const { snapshot, busy, error, load } = useDashboard()
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
const scheinDimensions: Record<string, string> = {
  technical: '專業能力',
  managerial: '管理整合',
  autonomy: '自主獨立',
  security: '安全穩定',
  entrepreneurial: '創業創新',
  service: '服務使命',
  challenge: '純粹挑戰',
  lifestyle: '生活整合',
}
const northStarAxes = computed(() =>
  Object.entries(scheinDimensions).map(([dimension, label]) => ({
    dimension,
    label,
    score: Math.min(
      100,
      Math.max(0, Math.round(snapshot.value?.frameworks.scores.schein[dimension] ?? 50)),
    ),
  })),
)
const northStarSignals = computed(
  () => snapshot.value?.frameworks.evidence.filter((signal) => signal.framework === 'schein') ?? [],
)
const northStarRankings = computed(() =>
  [...northStarAxes.value].sort((left, right) => right.score - left.score),
)
const activeAnchorCount = computed(
  () => new Set(northStarSignals.value.map((signal) => signal.dimension)).size,
)
const signalStrengthLabel = (score: number) => {
  const strength = Math.abs(score)
  const level = strength <= 3 ? '弱' : strength <= 6 ? '中度' : strength <= 8 ? '強' : '核心'
  if (score > 0) return `${level}支持`
  return strength >= 9 ? '明確排斥' : `${level}反向`
}
const northStarEvents = computed(() => {
  const events = new Map<
    string,
    { id: string; title: string; signals: typeof northStarSignals.value }
  >()
  for (const signal of northStarSignals.value) {
    const event = events.get(signal.eventId) ?? {
      id: signal.eventId,
      title: signal.eventTitle,
      signals: [],
    }
    event.signals.push(signal)
    events.set(signal.eventId, event)
  }
  return [...events.values()]
})
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
        <div class="north-star-summary" aria-label="職場北極星分數摘要">
          <div>
            <span>有效證據</span>
            <strong>{{ northStarSignals.length }}</strong>
            <small>筆</small>
          </div>
          <div>
            <span>已觸發錨點</span>
            <strong>{{ activeAnchorCount }}</strong>
            <small>/ 8</small>
          </div>
          <div>
            <span>目前最強</span>
            <strong class="summary-anchor">{{ northStarRankings[0]?.label ?? '尚未形成' }}</strong>
            <small>{{ northStarRankings[0]?.score ?? 0 }} 分</small>
          </div>
        </div>
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
        <aside class="north-star-evidence">
          <div class="north-star-evidence-heading">
            <div>
              <h2>事件如何形成這張圖</h2>
              <p>LLM 會從事件辨認各錨點的支持或反向證據，再綜合成上方指數。</p>
            </div>
            <span>{{ northStarEvents.length }} 筆事件</span>
          </div>
          <div v-if="northStarEvents.length" class="north-star-event-list">
            <article v-for="event in northStarEvents" :key="event.id" class="north-star-event">
              <header>
                <h3>{{ event.title }}</h3>
                <span>{{ event.signals.length }} 個錨點</span>
              </header>
              <div class="north-star-score-cluster">
                <div
                  v-for="signal in event.signals"
                  :key="signal.dimension"
                  class="north-star-score"
                >
                  <span>{{ scheinDimensions[signal.dimension] }}</span>
                  <strong :class="{ negative: signal.strength < 0 }">
                    {{ signalStrengthLabel(signal.strength) }}
                  </strong>
                </div>
              </div>
              <blockquote v-for="signal in event.signals" :key="`${signal.dimension}-quote`">
                <span>{{ scheinDimensions[signal.dimension] }}</span>
                「{{ signal.evidenceQuote }}」
              </blockquote>
            </article>
          </div>
          <p v-else class="no-evidence">目前沒有足夠原句可支持職涯錨點分數。</p>
        </aside>
      </section>
    </template>
  </main>
</template>
