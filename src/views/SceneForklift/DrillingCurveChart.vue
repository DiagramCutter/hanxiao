<template>
  <section class="panel-section drilling-curve" aria-label="单孔孔深—偏移曲线">
    <div class="curve-heading">
      <h2>孔深—偏移曲线</h2>
      <span>{{ pileName || '未选孔' }}</span>
    </div>
    <div v-if="data?.points.length && hasOffsets" class="curve-plot">
      <svg
        ref="plot"
        viewBox="0 0 300 140"
        role="img"
        :aria-label="`${pileName} 孔深偏移曲线，孔深向下增加，单位米；X和Y偏移单位毫米`"
        tabindex="0"
        @pointermove="inspectPoint"
        @pointerleave="hoverIndex = null"
        @blur="hoverIndex = null"
        @keydown.down.prevent="stepPoint(1)"
        @keydown.up.prevent="stepPoint(-1)"
      >
        <text x="4" y="12" class="axis-label">孔深（m）</text>
        <text x="162" y="12" text-anchor="middle" class="axis-label">偏移（mm）</text>
        <g v-for="offset in [-axes.offset, 0, axes.offset]" :key="offset" class="curve-grid">
          <line :x1="x(offset)" :x2="x(offset)" y1="34" y2="118" :class="{ zero: offset === 0 }" />
          <text :x="x(offset)" y="28" text-anchor="middle">{{ offset }}</text>
        </g>
        <g v-for="depth in [0, axes.depth / 2, axes.depth]" :key="depth" class="curve-grid">
          <line x1="42" x2="282" :y1="y(depth)" :y2="y(depth)" />
          <text x="35" :y="y(depth) + 3" text-anchor="end">{{ depth }}</text>
        </g>
        <g
          v-for="series in seriesData"
          :key="series.name"
          :stroke="series.color"
          :fill="series.color"
        >
          <template v-for="(segment, index) in series.segments" :key="index">
            <path
              :d="segmentPath(segment)"
              fill="none"
              stroke-width="1.8"
              vector-effect="non-scaling-stroke"
            />
            <circle
              v-if="segment.length === 1"
              :cx="x(segment[0]!.offset)"
              :cy="y(segment[0]!.depth)"
              r="2.4"
            />
          </template>
        </g>
        <g v-if="hoverPoint" class="hover-guide">
          <line x1="42" x2="282" :y1="y(hoverPoint.depthM)" :y2="y(hoverPoint.depthM)" />
          <circle
            v-if="hoverPoint.dipXMm !== null"
            :cx="x(hoverPoint.dipXMm)"
            :cy="y(hoverPoint.depthM)"
            r="3"
            fill="#25e0ef"
          />
          <circle
            v-if="hoverPoint.dipYMm !== null"
            :cx="x(hoverPoint.dipYMm)"
            :cy="y(hoverPoint.depthM)"
            r="3"
            fill="#ffbd59"
          />
        </g>
      </svg>
      <div v-if="hoverPoint" class="curve-tooltip" role="status">
        <strong>孔深 {{ hoverPoint.depthM }} m</strong>
        <span>X：{{ offsetText(hoverPoint.dipXMm) }}</span>
        <span>Y：{{ offsetText(hoverPoint.dipYMm) }}</span>
      </div>
    </div>
    <div v-else class="curve-empty" role="status" :aria-busy="loading">
      <span>{{ emptyMessage }}</span>
      <button v-if="error" :disabled="loading" @click="$emit('retry')">重新加载</button>
    </div>
    <div class="curve-footer">
      <div v-if="hasOffsets" class="curve-legend">
        <span><i></i>X 偏移</span><span><i></i>Y 偏移</span>
      </div>
      <span v-if="pileName">{{ loading ? '正在刷新…' : '每20秒刷新' }}</span>
    </div>
    <p v-if="data?.sampled" class="curve-sampled">
      已抽样 {{ data.points.length }}/{{ data.totalPoints }} 点，可能遗漏峰值
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SceneDrillingCurveData } from '@/interface/scene'
import { curveAxes, curveSegments } from './drillingCurve'

const props = defineProps<{
  pileName: string | null
  data: SceneDrillingCurveData | null
  loading: boolean
  error: string
}>()
defineEmits<{ retry: [] }>()
const plot = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)
const points = computed(() => props.data?.points ?? [])
const axes = computed(() => curveAxes(points.value))
const x = (offset: number) => 162 + (offset / axes.value.offset) * 120
const y = (depth: number) => 34 + (depth / axes.value.depth) * 84
const hasOffsets = computed(() =>
  points.value.some((point) => point.dipXMm !== null || point.dipYMm !== null),
)
const seriesData = computed(() => [
  { name: 'X', color: '#25e0ef', segments: curveSegments(points.value, 'dipXMm') },
  { name: 'Y', color: '#ffbd59', segments: curveSegments(points.value, 'dipYMm') },
])
const segmentPath = (segment: { offset: number; depth: number }[]) =>
  segment
    .map((point, index) => `${index ? 'L' : 'M'}${x(point.offset)} ${y(point.depth)}`)
    .join(' ')
const hoverPoint = computed(() =>
  hoverIndex.value === null ? null : (points.value[hoverIndex.value] ?? null),
)
const offsetText = (value: number | null) => (value === null ? '暂无数据' : `${value} mm`)
const emptyMessage = computed(() => {
  if (!props.pileName) return '选择槽孔查看历史曲线'
  if (props.loading) return '正在加载该孔历史曲线…'
  if (props.error) return props.error
  return points.value.length ? '有孔深记录，暂无偏移数据' : '该孔暂无历史曲线数据'
})
watch(
  () => props.data,
  () => {
    hoverIndex.value = null
  },
)

function stepPoint(direction: number) {
  if (!points.value.length) return
  hoverIndex.value = Math.max(
    0,
    Math.min(
      points.value.length - 1,
      (hoverIndex.value ?? (direction > 0 ? -1 : points.value.length)) + direction,
    ),
  )
}
function inspectPoint(event: PointerEvent) {
  const matrix = plot.value?.getScreenCTM()
  if (!plot.value || !matrix || !points.value.length) return
  const position = plot.value.createSVGPoint()
  position.x = event.clientX
  position.y = event.clientY
  const local = position.matrixTransform(matrix.inverse())
  if (local.x < 42 || local.x > 282 || local.y < 34 || local.y > 118) {
    hoverIndex.value = null
    return
  }
  const depth = ((local.y - 34) / 84) * axes.value.depth
  let low = 0
  let high = points.value.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (points.value[mid]!.depthM < depth) low = mid + 1
    else high = mid
  }
  hoverIndex.value =
    low > 0 &&
    Math.abs(points.value[low - 1]!.depthM - depth) < Math.abs(points.value[low]!.depthM - depth)
      ? low - 1
      : low
}
</script>

<style scoped>
.drilling-curve {
  flex: 1 0 auto;
  min-height: calc(155 * var(--u));
  display: flex;
  flex-direction: column;
}
.curve-heading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(6 * var(--u));
  margin-bottom: calc(7 * var(--u));
}
.curve-heading h2 {
  position: relative;
  margin: 0;
  padding-left: calc(13 * var(--u));
  font-size: calc(18 * var(--u));
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}
.curve-heading h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: calc(4 * var(--u));
  background: #00d7f4;
  box-shadow: 0 0 8px #00c7f450;
}
.curve-heading > span {
  font-size: calc(12 * var(--u));
  color: #a3c3d7;
  white-space: nowrap;
}
.curve-plot {
  position: relative;
  flex: 1;
  min-height: calc(95 * var(--u));
}
.curve-plot svg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.curve-plot text {
  fill: #a2bdd2;
  font-size: 10px;
}
.curve-grid line {
  stroke: #214e66;
  stroke-width: 0.6;
  stroke-dasharray: 2 3;
}
.curve-grid .zero {
  stroke: #53859b;
  stroke-dasharray: 0;
}
.curve-plot svg:focus-visible {
  outline: 1px solid #00dcee;
}
.hover-guide line {
  stroke: #b8d5e7;
  stroke-dasharray: 2 3;
  stroke-width: 0.6;
}
.curve-tooltip {
  position: absolute;
  right: calc(2 * var(--u));
  top: calc(2 * var(--u));
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: calc(6 * var(--u));
  border: 1px solid #29647c;
  border-radius: 4px;
  background: #001623f2;
  font-size: calc(11 * var(--u));
  color: #cce9f4;
  pointer-events: none;
}
.curve-tooltip strong {
  font-weight: 500;
  color: #f1f8ff;
}
.curve-empty {
  flex: 1;
  min-height: calc(95 * var(--u));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--u));
  color: #8aafc4;
  font-size: calc(12 * var(--u));
}
.curve-empty button {
  font: inherit;
  color: #d7ecfd;
  padding: calc(5 * var(--u)) calc(10 * var(--u));
  border: 1px solid #08648d;
  border-radius: calc(5 * var(--u));
  background: #001b2cdd;
  cursor: pointer;
}
.curve-empty button:disabled {
  opacity: 0.45;
  cursor: default;
}
.curve-empty button:focus-visible {
  outline: 2px solid #00dcee;
  outline-offset: 3px;
}
.curve-footer {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(5 * var(--u));
  margin-top: calc(4 * var(--u));
  font-size: calc(10 * var(--u));
  color: #7fa5bf;
}
.curve-legend,
.curve-legend span {
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
}
.curve-legend {
  gap: calc(16 * var(--u));
}
.curve-legend i {
  width: calc(12 * var(--u));
  height: 2px;
  background: #25e0ef;
}
.curve-legend span:nth-child(2) i {
  background: #ffbd59;
}
.curve-sampled {
  flex: none;
  margin: calc(5 * var(--u)) 0 0;
  color: #dfb66f;
  font-size: calc(10 * var(--u));
  line-height: 1.3;
}
</style>
