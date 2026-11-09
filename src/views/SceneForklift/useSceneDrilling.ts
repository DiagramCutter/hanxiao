import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneDrillingApi } from '@/api/scene'
import type { SceneDrillingData } from '@/interface/scene'

const holeDisplayNames = new Map([
  ['S1-1', '1-p1'],
  ['S1-2', '1-p2'],
  ['S1-3', '1-p3'],
])
const numericValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export function useSceneDrilling() {
  const drilling = ref<SceneDrillingData | null>(null)
  const error = ref('')
  const loading = ref(true)
  let active = false
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneDrillingApi> | undefined

  const currentHole = computed(() => {
    const data = drilling.value
    const pileName = typeof data?.pileName === 'string' ? data.pileName.trim() : ''
    const seconds = numericValue(data?.stayDurationSeconds)
    const validStay = data?.stayStatus === 'STAYING' || data?.stayStatus === 'CONFIRMING'
    return {
      pileName: pileName || null,
      code: pileName ? (holeDisplayNames.get(pileName) ?? pileName) : null,
      depthM: numericValue(data?.holeDepthM),
      // 使用后端计算的秒数，转为分钟最多两位小数，不按前端时钟自行累加。
      dwellMinutes:
        validStay && seconds !== null && seconds >= 0 && Number.isInteger(seconds)
          ? Number((seconds / 60).toFixed(2))
          : null,
    }
  })
  const caption = computed(() => {
    if (error.value) return '读取失败'
    if (loading.value) return drilling.value ? '刷新中' : '加载中'
    return currentHole.value.code !== null || currentHole.value.depthM !== null
      ? '每20秒刷新'
      : '暂无数据'
  })
  const stayCaption = computed(() => {
    if (error.value) return '读取失败'
    if (loading.value && !drilling.value) return '加载中'
    switch (drilling.value?.stayStatus) {
      case 'STAYING':
        return currentHole.value.dwellMinutes !== null ? '已确认' : '暂无数据'
      case 'CONFIRMING':
        return '确认中'
      case 'NO_DEPTH_DATA':
        return '暂无深度'
      case 'STALE_DATA':
        return '数据过期'
      case 'HISTORY_LIMIT':
        return '历史不足'
      default:
        return '暂无数据'
    }
  })

  async function refresh() {
    if (!active || pending) return
    const request = getSceneDrillingApi()
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
        throw new Error('获取当前孔位与深度失败')
      }
      drilling.value = result.data
      error.value = ''
    } catch {
      if (active) {
        drilling.value = null
        error.value = '当前孔位与深度读取失败，将自动重试'
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

  return { drilling, currentHole, caption, stayCaption, loading, error, refresh }
}
