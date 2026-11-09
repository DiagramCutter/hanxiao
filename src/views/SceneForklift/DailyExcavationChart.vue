<template>
  <section class="panel-section daily-excavation" aria-label="近7日开挖进尺">
    <div class="section-heading">
      <h2>近7日开挖进尺</h2>
      <span class="section-caption">单位：米（m）</span>
    </div>
    <div v-if="!data" class="daily-empty" role="status" :aria-busy="loading">
      <span>{{ loading ? '正在加载开挖进尺…' : error || '暂无开挖进尺数据' }}</span>
      <button v-if="error" class="quiet-button" :disabled="loading" @click="$emit('retry')">
        重新加载
      </button>
    </div>
    <svg v-else class="daily-chart" viewBox="0 0 300 132" role="img" :aria-label="chartDescription">
      <defs>
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#39ddec" />
          <stop offset="100%" stop-color="#0876b6" />
        </linearGradient>
      </defs>
      <g v-for="tick in [0, axisMax / 2, axisMax]" :key="tick" class="daily-axis">
        <line x1="32" x2="296" :y1="barY(tick)" :y2="barY(tick)" />
        <text x="27" :y="barY(tick) + 3" text-anchor="end">{{ formatAxis(tick) }}</text>
      </g>
      <g v-for="(day, index) in data.days" :key="day.date" class="daily-bar">
        <title>{{ day.date }}：{{ day.excavatedDepthM }} 米</title>
        <rect
          :x="39 + index * 37"
          :y="barY(day.excavatedDepthM)"
          width="22"
          :height="(day.excavatedDepthM / axisMax) * 82"
          :fill="`url(#${gradientId})`"
        />
        <text :x="50 + index * 37" :y="barY(day.excavatedDepthM) - 5" class="daily-value">
          {{ formatDepth(day.excavatedDepthM) }}
        </text>
        <text :x="50 + index * 37" y="120" class="daily-date">
          {{ day.date.slice(5).replace('-', '/') }}
        </text>
      </g>
    </svg>
    <div v-if="data" class="daily-caption">
      <span>每日新增进尺</span><span>今日统计截至当前</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { SceneDailyExcavationData } from '@/interface/scene'

const props = defineProps<{
  data: SceneDailyExcavationData | null
  loading: boolean
  error: string
}>()
defineEmits<{ retry: [] }>()
const gradientId = `daily-excavation-${useId()}`
const axisMax = computed(() => {
  const largest = Math.max(0, ...(props.data?.days.map((day) => day.excavatedDepthM) ?? []))
  if (!largest) return 1
  const magnitude = 10 ** Math.floor(Math.log10(largest))
  const step = [1, 2, 5, 10].find((value) => value * magnitude >= largest) ?? 10
  return step * magnitude
})
const barY = (value: number) => 102 - (value / axisMax.value) * 82
const formatDepth = (value: number) =>
  value > 0 && value < 0.01 ? '<0.01' : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatAxis = (value: number) =>
  value.toLocaleString('zh-CN', { notation: 'compact', maximumSignificantDigits: 3 })
const chartDescription = computed(
  () =>
    '近7日开挖进尺，单位米。' +
    (props.data?.days.map((day) => `${day.date}：${day.excavatedDepthM}米`).join('；') ?? ''),
)
</script>

<style scoped>
.daily-excavation {
  flex: 1;
  min-height: calc(158 * var(--u));
  padding-top: calc(12 * var(--u));
  display: flex;
  flex-direction: column;
}
.daily-excavation h2 {
  position: relative;
  margin: 0;
  padding-left: calc(13 * var(--u));
  font-size: calc(16 * var(--u));
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}
.daily-excavation h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: calc(4 * var(--u));
  background: #00d7f4;
  box-shadow: 0 0 8px #00c7f450;
}
.daily-excavation .section-caption {
  font-size: calc(10 * var(--u));
  color: #9ebbd1;
  white-space: nowrap;
}
.daily-excavation .section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: calc(26 * var(--u));
  gap: calc(8 * var(--u));
  margin-bottom: calc(4 * var(--u));
}
.daily-chart {
  flex: 1;
  width: 100%;
  min-height: calc(94 * var(--u));
  height: calc(120 * var(--u));
  overflow: visible;
}
.daily-axis line {
  stroke: #16475f;
  stroke-dasharray: 2 3;
}
.daily-axis text,
.daily-date {
  fill: #9dbbd0;
  font-size: 9px;
}
.daily-date,
.daily-value {
  text-anchor: middle;
}
.daily-value {
  fill: #d6edfa;
  font-size: 10px;
}
.daily-bar:hover rect {
  filter: brightness(1.2);
}
.daily-caption {
  display: flex;
  justify-content: space-between;
  gap: calc(8 * var(--u));
  margin: calc(5 * var(--u)) 0 calc(10 * var(--u));
  font-size: calc(10 * var(--u));
  color: #8eb0c6;
}
.daily-empty {
  flex: 1;
  min-height: calc(110 * var(--u));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--u));
  font-size: calc(12 * var(--u));
  color: #9dbbd0;
}
.daily-empty button {
  box-sizing: border-box;
  padding: calc(5 * var(--u)) calc(10 * var(--u));
  border: 1px solid #08648d;
  border-radius: calc(5 * var(--u));
  background: #001b2cdd;
  color: #d7ecfd;
  font: inherit;
  cursor: pointer;
}
.daily-empty button:disabled {
  opacity: 0.45;
  cursor: default;
}
.daily-empty button:focus-visible {
  outline: 2px solid #00dcee;
  outline-offset: 3px;
}
</style>
