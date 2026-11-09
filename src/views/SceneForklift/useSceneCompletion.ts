import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneCompletionApi } from '@/api/scene'
import type { SceneCompletionData } from '@/interface/scene'

function isCompletionData(value: unknown): value is SceneCompletionData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const { accumulatedDepthM } = value as Partial<SceneCompletionData>
  // 顶部仅展示累计米数，未使用的孔数不影响该指标读取。
  return (
    accumulatedDepthM === null ||
    (typeof accumulatedDepthM === 'number' &&
      Number.isFinite(accumulatedDepthM) &&
      accumulatedDepthM >= 0)
  )
}

export function useSceneCompletion() {
  const data = ref<SceneCompletionData | null>(null)
  const loading = ref(true)
  const error = ref('')
  let active = false
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneCompletionApi> | undefined

  async function refresh() {
    if (!active || pending) return
    loading.value = true
    const request = getSceneCompletionApi()
    pending = request
    try {
      const result = await request
      if (!active) return
      if (
        result?.code !== 0 ||
        result.success === false ||
        (result.data !== null && !isCompletionData(result.data))
      ) {
        throw new Error('Invalid scene completion response')
      }
      data.value = result.data
      error.value = ''
    } catch {
      if (active) {
        data.value = null
        error.value = '累计完成数据暂不可用，正在重试'
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
