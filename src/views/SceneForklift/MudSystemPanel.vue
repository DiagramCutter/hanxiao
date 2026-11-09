<template>
  <section class="mud-system-panel" aria-labelledby="mud-system-heading">
    <header class="mud-system-heading">
      <h3 id="mud-system-heading">泥浆系统</h3>
      <span class="mud-system-status" :class="{ warning: error }" role="status">
        <i></i>{{ status }}
      </span>
    </header>
    <dl class="mud-system-values">
      <div v-for="item in items" :key="item.id" :data-field="item.id">
        <dt>{{ item.name }}</dt>
        <dd :class="{ empty: item.value === '--' }" :title="item.value">{{ item.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSceneMudSystem } from './useSceneMudSystem'

const { items, loading, error } = useSceneMudSystem()
const status = computed(() => {
  if (error.value) return error.value
  const count = items.value.filter((item) => item.value !== '--').length
  if (count === items.value.length) return '实时采集'
  if (count) return '部分数据待采集'
  return loading.value ? '读取中' : '等待数据'
})
</script>

<style scoped>
.mud-system-panel {
  position: absolute;
  bottom: calc(44 * var(--u));
  left: 50%;
  transform: translateX(-50%);
  width: min(calc(720 * var(--u)), calc(100% - 32 * var(--u)));
  box-sizing: border-box;
  padding: calc(10 * var(--u)) calc(12 * var(--u));
  border: 1px solid #0089bd;
  border-radius: calc(10 * var(--u));
  background: linear-gradient(115deg, #00283cf5, #001a2ef5);
  box-shadow:
    inset 3px 0 0 #00669888,
    0 6px 20px #0005;
}
.mud-system-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--u));
  margin-bottom: calc(8 * var(--u));
}
.mud-system-heading h3 {
  margin: 0;
  padding-left: calc(8 * var(--u));
  border-left: calc(3 * var(--u)) solid #00d7f4;
  color: #e0f4ff;
  font-size: calc(14 * var(--u));
  font-weight: 600;
  line-height: 1.2;
}
.mud-system-status {
  display: flex;
  align-items: center;
  gap: calc(5 * var(--u));
  color: #62cfc8;
  font-size: calc(10 * var(--u));
  white-space: nowrap;
}
.mud-system-status i {
  width: calc(5 * var(--u));
  height: calc(5 * var(--u));
  border-radius: 50%;
  background: currentColor;
}
.mud-system-status.warning {
  color: #dfb66f;
}
.mud-system-values {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin: 0;
}
.mud-system-values > div {
  min-width: 0;
  padding: 0 calc(10 * var(--u));
  text-align: center;
}
.mud-system-values > div + div {
  border-left: 1px solid #15506c;
}
.mud-system-values dt {
  color: #bfd7e9;
  font-size: calc(13 * var(--u));
  white-space: nowrap;
}
.mud-system-values dd {
  margin: calc(2 * var(--u)) 0 0;
  color: #7eeaf6;
  font-size: calc(24 * var(--u));
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.mud-system-values dd.empty {
  color: #7196ad;
}
@media (max-width: 820px) {
  .mud-system-panel {
    bottom: calc(124 * var(--u));
  }
  .mud-system-values {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: calc(10 * var(--u));
  }
  .mud-system-values > div:nth-child(4) {
    border-left: 0;
  }
}
</style>
