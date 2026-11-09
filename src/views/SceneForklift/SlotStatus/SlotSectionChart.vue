<template>
  <div class="section-scroll">
    <svg
      viewBox="0 0 1120 610"
      role="group"
      :aria-label="`九个槽孔施工剖面图，地面为零米，向下至${depthRange}米`"
    >
      <defs>
        <pattern :id="soilId" width="32" height="30" patternUnits="userSpaceOnUse">
          <rect width="32" height="30" fill="#72634f" />
          <path d="M3 7l5-3 6 4-4 6-7-1z M20 19l6-3 5 6-7 5z" fill="#a6967b" opacity=".7" />
          <path d="M19 3l4 3-2 4-4-2z M4 23l4-3 3 5z" fill="#493f35" />
          <circle cx="16" cy="19" r="1" fill="#cbb493" />
        </pattern>
        <pattern :id="concreteId" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#9faebc" />
          <path d="M2 5h3 M10 13h4 M14 3h2" stroke="#6d7d8d" stroke-width="1.5" />
          <circle cx="5" cy="14" r="1" fill="#d3dce3" />
        </pattern>
      </defs>
      <text x="12" y="90" class="muted">深度/m</text>
      <rect x="90" y="70" width="990" height="38" :fill="`url(#${concreteId})`" />
      <text x="585" y="95" text-anchor="middle" fill="#172d40" class="ground-label">
        地面 · 水泥硬化板
      </text>
      <g v-for="tick in depthTicks" :key="tick">
        <text x="72" :y="depthToY(tick) + 6" text-anchor="end" class="muted">{{ tick }}</text>
        <line
          x1="82"
          x2="1080"
          :y1="depthToY(tick)"
          :y2="depthToY(tick)"
          stroke="#b7d7ef"
          stroke-opacity=".2"
          stroke-dasharray="4 5"
        />
      </g>
      <g
        v-for="(slot, index) in orderedSlots"
        :key="slotDisplayOrder[index]"
        :transform="`translate(${90 + index * 110},0)`"
        class="slot-column"
        :tabindex="slot ? 0 : -1"
        role="group"
        :aria-label="detail(slot, index)"
      >
        <title>{{ detail(slot, index) }}</title>
        <text x="55" y="43" text-anchor="middle" :fill="statusColor(slot)" class="status-label">
          {{ slot ? slotStatusText(slot.status) : '暂无数据' }}
        </text>
        <rect
          :y="plotTop"
          width="110"
          :height="plotHeight"
          :fill="validDepth(slot?.excavatedDepthM) !== null ? `url(#${soilId})` : '#344659'"
        />
        <rect
          v-if="validDepth(slot?.excavatedDepthM) !== null"
          x="0"
          :y="plotTop"
          width="110"
          :height="depthToY(slot!.excavatedDepthM!) - plotTop"
          fill="#426579"
        />
        <g v-if="marker(slot) !== null">
          <line
            x1="2"
            x2="108"
            :y1="depthToY(marker(slot)!)"
            :y2="depthToY(marker(slot)!)"
            stroke="#80efd7"
            stroke-width="3"
          />
          <rect
            x="9"
            :y="labelY(slot)"
            width="92"
            height="39"
            rx="4"
            fill="#132b3e"
            fill-opacity="0.94"
          />
          <text x="55" :y="labelY(slot) + 14" text-anchor="middle" fill="#b5cecf" font-size="11">
            已成孔深度
          </text>
          <text
            x="55"
            :y="labelY(slot) + 31"
            text-anchor="middle"
            fill="#a1ffe5"
            class="depth-label"
          >
            {{ marker(slot) }} m
          </text>
        </g>
        <rect
          class="column-outline"
          x="1"
          :y="plotTop"
          width="108"
          :height="plotHeight"
          fill="none"
        />
        <text x="55" :y="plotBottom + 31" text-anchor="middle" fill="#edf6ff" class="name-label">
          {{ slot?.name ?? slotDisplayOrder[index] }}
        </text>
        <text x="55" :y="plotBottom + 55" text-anchor="middle" class="muted">
          设计 {{ metres(slot?.designDepthM) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  slotDepthRange,
  slotDisplayOrder,
  slotStatusText,
  type SlotStatusItem,
} from '@/interface/slot'

const props = defineProps<{ slots: SlotStatusItem[] }>()
const instanceId = useId()
const soilId = `${instanceId}-slot-soil`
const concreteId = `${instanceId}-slot-concrete`
const orderedSlots = computed(() =>
  slotDisplayOrder.map((code) => props.slots.find((slot) => slot.code === code)),
)
const plotTop = 108
const plotHeight = 400
const plotBottom = plotTop + plotHeight
const depthRange = computed(() => slotDepthRange(props.slots))
const depthTicks = computed(() => [0, 1, 2, 3, 4].map((index) => (depthRange.value * index) / 4))
const validDepth = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
// 标尺只影响 SVG 坐标，展示数值始终保留接口原值。
const depthToY = (value: number) =>
  plotTop + (Math.max(0, Math.min(depthRange.value, value)) / depthRange.value) * plotHeight
const marker = (slot?: SlotStatusItem) => {
  if (!slot || slot.status === 'NOT_STARTED') return null
  return validDepth(slot.excavatedDepthM)
}
const labelY = (slot?: SlotStatusItem) =>
  Math.max(plotTop + 5, Math.min(plotBottom - 44, depthToY(marker(slot) ?? 0) + 8))
const statusColor = (slot?: SlotStatusItem) =>
  !slot || slot.status === null
    ? '#99aab9'
    : slot.status === 'COMPLETED'
      ? '#80efd7'
      : slot.status === 'NOT_STARTED'
        ? '#bcad94'
        : '#f6ce8e'
const metres = (value: number | null | undefined) =>
  validDepth(value) === null ? '暂无数据' : `${value} m`
const detail = (slot: SlotStatusItem | undefined, index: number) =>
  slot
    ? `${slot.name} · ${slotStatusText(slot.status)}\n设计深度：${metres(slot.designDepthM)}\n已成孔深度：${metres(slot.excavatedDepthM)}\n更新时间：${slot.updatedAt ?? '暂无数据'}`
    : `${slotDisplayOrder[index]}：暂无数据`
</script>

<style scoped>
.section-scroll {
  overflow-x: auto;
}
svg {
  display: block;
  width: 100%;
  min-width: 760px;
}
.muted {
  fill: #a7bacd;
  font-size: 13px;
}
.ground-label,
.status-label,
.depth-label {
  font-size: 15px;
}
.name-label {
  font-size: 16px;
}
.column-outline {
  stroke: #cad8e4;
  stroke-opacity: 0.65;
  pointer-events: none;
}
.slot-column:focus {
  outline: none;
}
.slot-column:focus-visible .column-outline,
.slot-column:hover .column-outline {
  stroke: #80efd7;
  stroke-width: 3;
  stroke-opacity: 1;
}
.slot-column:focus-visible .column-outline {
  stroke-dasharray: 8 4;
}
</style>
