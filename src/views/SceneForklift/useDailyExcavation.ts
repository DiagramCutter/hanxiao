import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneDailyExcavationApi } from '@/api/scene'
import type { SceneDailyExcavationData } from '@/interface/scene'

function isDailyExcavationData(value: unknown): value is SceneDailyExcavationData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<SceneDailyExcavationData>
  if (data.unit !== 'm' || !Array.isArray(data.days) || data.days.length !== 7) return false
  let previousDate: number | undefined
  return data.days.every((day) => {
    if (
      !day ||
      typeof day.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      typeof day.excavatedDepthM !== 'number' ||
      !Number.isFinite(day.excavatedDepthM) ||
      day.excavatedDepthM < 0
    )
      return false
    // Validate date continuity without shifting the server's Shanghai calendar dates.
    const date = new Date(day.date + 'T00:00:00Z')
    const timestamp = date.getTime()
    if (!Number.isFinite(timestamp) || date.toISOString().slice(0, 10) !== day.date) return false
    if (previousDate !== undefined && timestamp - previousDate !== 86_400_000) return false
    previousDate = timestamp
    return true
  })
}

export function useDailyExcavation() {
  const data = ref<SceneDailyExcavationData | null>(null)
  const loading = ref(true)
  const error = ref('')
  let active = false
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneDailyExcavationApi> | undefined

  async function refresh() {
    if (!active || pending) return
    loading.value = true
    const request = getSceneDailyExcavationApi()
    pending = request
    try {
      const result = await request
      if (!active) return
      if (result?.code !== 0 || result.success === false || !isDailyExcavationData(result.data)) {
        throw new Error('Invalid daily excavation response')
      }
      // Increment calculation and missing-day zeros belong to the server.
      data.value = result.data
      error.value = ''
    } catch {
      if (active) {
        data.value = null
        error.value = '开挖进尺暂不可用，请重试'
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

  return { data, loading, error, refresh }
}
