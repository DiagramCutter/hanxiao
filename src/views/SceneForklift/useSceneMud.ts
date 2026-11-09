import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneMudApi } from '@/api/scene'
import type { SceneMudData } from '@/interface/scene'
import type { MudMonitoringData } from './cleaningDashboardData'

const numericValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export function useSceneMud() {
  const data = ref<SceneMudData | null>(null)
  const error = ref('')
  const loading = ref(true)
  let active = false
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneMudApi> | undefined

  // 原值直接映射到页面，单位由面板固定展示；空值与有效的 0 分开处理。
  const mudData = computed<MudMonitoringData>(() => ({
    viscositySeconds: numericValue(data.value?.viscosity_mud),
    densityGcm3: numericValue(data.value?.density_mud),
    sandContentPercent: numericValue(data.value?.cs_mud),
    temperatureC: numericValue(data.value?.temp_mud),
  }))
  const caption = computed(() => {
    if (error.value) return '读取失败，重试中'
    if (loading.value) return data.value ? '刷新中' : '加载中'
    return Object.values(mudData.value).some((value) => value !== null)
      ? '每20秒刷新'
      : '暂无数据'
  })

  async function refresh() {
    if (!active || pending) return
    const request = getSceneMudApi()
    pending = request
    loading.value = true
    try {
      const result = await request
      if (!active) return
      if (
        !result ||
        result.code !== 0 ||
        result.success === false ||
        (result.data !== null &&
          (typeof result.data !== 'object' || Array.isArray(result.data)))
      ) {
        throw new Error('获取回浆数据失败')
      }
      data.value = result.data
      error.value = ''
    } catch {
      if (active) {
        data.value = null
        error.value = '回浆数据读取失败，将自动重试'
      }
    } finally {
      if (pending === request) pending = undefined
      if (active) loading.value = false
    }
  }

  onMounted(() => {
    active = true
    void refresh()
    timer = setInterval(() => void refresh(), 20_000)
  })

  onBeforeUnmount(() => {
    active = false
    clearInterval(timer)
    pending?.abort()
  })

  return { mudData, caption, loading, error, refresh }
}
