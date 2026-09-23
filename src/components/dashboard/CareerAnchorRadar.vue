<script setup lang="ts">
import { computed } from 'vue'

interface CareerAnchorAxis {
  label: string
  score: number
}

const props = defineProps<{ axes: CareerAnchorAxis[]; compact?: boolean }>()

const center = 220
const radius = 126
const labelRadius = 166
const angleAt = (index: number) => (Math.PI * 2 * index) / props.axes.length - Math.PI / 2
const pointAt = (index: number, distance: number) => ({
  x: center + Math.cos(angleAt(index)) * distance,
  y: center + Math.sin(angleAt(index)) * distance,
})
const polygonAt = (percentage: number) =>
  props.axes
    .map((_, index) => {
      const point = pointAt(index, radius * (percentage / 100))
      return `${point.x},${point.y}`
    })
    .join(' ')

const gridPolygons = computed(() => [25, 50, 75, 100].map(polygonAt))
const dataPolygon = computed(() =>
  props.axes
    .map((axis, index) => {
      const point = pointAt(index, radius * (Math.min(100, Math.max(0, axis.score)) / 100))
      return `${point.x},${point.y}`
    })
    .join(' '),
)
const axisEnds = computed(() => props.axes.map((_, index) => pointAt(index, radius)))
const labels = computed(() =>
  props.axes.map((axis, index) => {
    const point = pointAt(index, labelRadius)
    const cosine = Math.cos(angleAt(index))
    return {
      ...axis,
      x: point.x,
      y: point.y,
      anchor: cosine > 0.35 ? 'start' : cosine < -0.35 ? 'end' : 'middle',
    }
  }),
)
const accessibleSummary = computed(() =>
  props.axes.map((axis) => `${axis.label} ${axis.score} 分`).join('、'),
)
</script>

<template>
  <figure class="career-anchor-radar" :class="{ compact }">
    <svg viewBox="0 0 440 440" role="img" :aria-label="`八項職涯錨定指數：${accessibleSummary}`">
      <polygon
        v-for="(points, index) in gridPolygons"
        :key="index"
        :points="points"
        class="career-radar-grid"
      />
      <line
        v-for="(point, index) in axisEnds"
        :key="`axis-${index}`"
        :x1="center"
        :y1="center"
        :x2="point.x"
        :y2="point.y"
        class="career-radar-axis"
      />
      <polygon :points="dataPolygon" class="career-radar-data" />
      <circle cx="220" cy="220" r="3" class="career-radar-center" />
      <text
        v-for="axis in labels"
        :key="axis.label"
        :x="axis.x"
        :y="axis.y - 7"
        :text-anchor="axis.anchor"
        class="career-radar-label"
      >
        <tspan :x="axis.x">{{ axis.label }}</tspan>
        <tspan :x="axis.x" dy="16" class="career-radar-score">{{ axis.score }}分</tspan>
      </text>
    </svg>
  </figure>
</template>

<style scoped>
.career-anchor-radar {
  width: min(100%, 510px);
  margin: 0 auto;
}
.career-anchor-radar svg {
  display: block;
  width: 100%;
  overflow: visible;
}
.career-radar-grid,
.career-radar-axis {
  fill: none;
  stroke: #ddd8cf;
  stroke-width: 1;
}
.career-radar-data {
  fill: #77a9d866;
  stroke: #2f77b8;
  stroke-linejoin: round;
  stroke-width: 2.2;
}
.career-radar-center {
  fill: #2f77b8;
}
.career-radar-label {
  fill: #433f39;
  font-size: 12px;
  font-weight: 750;
}
.career-radar-score {
  fill: #2f77b8;
  font-size: 10px;
  font-weight: 800;
}
.compact {
  width: min(100%, 440px);
}
@media (max-width: 680px) {
  .career-radar-label {
    font-size: 11px;
  }
}
</style>
