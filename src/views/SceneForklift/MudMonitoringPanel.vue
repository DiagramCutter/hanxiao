<template>
  <section class="mud-monitoring dashboard-panel" :aria-label="title" :aria-busy="loading">
    <div class="mud-heading">
      <h2>{{ title }}</h2>
      <span role="status" :class="{ 'has-error': error }" :title="error || caption">{{
        caption
      }}</span>
    </div>
    <dl class="mud-grid">
      <div v-for="metric in metrics" :key="metric.label" class="mud-card">
        <dt>{{ metric.label }}</dt>
        <dd>
          <strong :title="metric.value === null ? '暂无数据' : undefined">{{
            metric.value ?? '--'
          }}</strong
          ><small>{{ metric.unit }}</small>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MudMonitoringData } from './cleaningDashboardData'

const props = defineProps<{
  title: string
  caption: string
  data: MudMonitoringData
  loading?: boolean
  error?: string
}>()

const metrics = computed(() => [
  { label: '泥浆粘度', value: props.data.viscositySeconds, unit: 's' },
  { label: '泥浆密度', value: props.data.densityGcm3, unit: 'g/cm³' },
  { label: '泥浆含沙量', value: props.data.sandContentPercent, unit: '%' },
  { label: '泥浆温度', value: props.data.temperatureC, unit: '℃' },
])
</script>

<style scoped>
.mud-monitoring {
  flex-shrink: 0;
  padding: calc(13 * var(--u));
}
.mud-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(8 * var(--u));
  margin-bottom: calc(14 * var(--u));
  height: calc(26 * var(--u));
}
.mud-heading h2 {
  margin: 0;
  padding-left: calc(12 * var(--u));
  border-left: calc(4 * var(--u)) solid #00d7f4;
  font-size: calc(20 * var(--u));
  line-height: 1.2;
  font-weight: 600;
  white-space: nowrap;
}
.mud-heading > span {
  color: #79adb9;
  font-size: calc(11 * var(--u));
  white-space: nowrap;
}
.mud-heading > .has-error {
  color: #f3b479;
}
.mud-grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(10 * var(--u));
}
.mud-card {
  min-width: 0;
  min-height: calc(91 * var(--u));
  padding: calc(15 * var(--u)) calc(10 * var(--u));
  border: 1px solid #145373;
  border-radius: calc(5 * var(--u));
  background: linear-gradient(135deg, #00304770, #001727);
}
.mud-card dt {
  color: #bdd8e9;
  font-size: calc(14 * var(--u));
  white-space: nowrap;
}
.mud-card dd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: calc(6 * var(--u));
  margin: calc(10 * var(--u)) 0 0;
  line-height: 1.1;
}
.mud-card strong {
  color: #b6f1ff;
  font-size: calc(29 * var(--u));
  font-weight: 650;
}
.mud-card small {
  color: #91b6ca;
  font-size: calc(13 * var(--u));
  white-space: nowrap;
}
</style>
