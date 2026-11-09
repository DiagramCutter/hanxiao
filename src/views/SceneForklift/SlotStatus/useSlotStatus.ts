import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getSceneSlotsApi } from '@/api/scene'
import type { SlotStatusItem } from '@/interface/slot'
import { parseSceneSlotStatus } from './slotStatusSource'

/** 主页面与状态弹窗共用的数据读取规则；关闭或卸载后丢弃未完成请求。 */
export function useSlotStatus(enabled: MaybeRefOrGetter<boolean> = true) {
  const slots = ref<SlotStatusItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const lastFetched = ref('')
  let timer: ReturnType<typeof setInterval> | undefined
  let generation = 0
  let active = true
  let pending: ReturnType<typeof getSceneSlotsApi> | undefined

  async function refresh() {
    if (!active || pending || !toValue(enabled)) return
    const current = generation
    const request = getSceneSlotsApi()
    pending = request
    loading.value = true
    error.value = ''
    try {
      const response = await request
      if (!active || current !== generation) return
      const result = parseSceneSlotStatus(response)
      slots.value = result.slots
      lastFetched.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    } catch {
      if (active && current === generation) {
        error.value = slots.value.length
          ? '刷新失败，当前保留上次数据，请稍后重试。'
          : '数据加载失败，请点击刷新重试。'
      }
    } finally {
      if (pending === request) pending = undefined
      if (current === generation) loading.value = false
    }
  }

  function stop() {
    clearInterval(timer)
    timer = undefined
    generation++
    pending?.abort()
    pending = undefined
    loading.value = false
  }

  watch(
    () => toValue(enabled),
    (open) => {
      stop()
      if (active && open) {
        void refresh()
        timer = setInterval(() => void refresh(), 60_000)
      }
    },
    { immediate: true },
  )
  onUnmounted(() => {
    active = false
    stop()
  })

  return { slots, loading, error, lastFetched, refresh }
}
