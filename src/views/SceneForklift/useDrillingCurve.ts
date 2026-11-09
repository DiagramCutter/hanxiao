import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getSceneDrillingCurveApi } from '@/api/scene'
import type { SceneDrillingCurveData } from '@/interface/scene'
import { normalizeCurvePileName, parseDrillingCurve } from './drillingCurve'

export function useDrillingCurve(pileName: MaybeRefOrGetter<string | null>) {
  const data = ref<SceneDrillingCurveData | null>(null)
  const loading = ref(false)
  const error = ref('')
  let active = true
  let generation = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneDrillingCurveApi> | undefined

  async function refresh() {
    const pile = normalizeCurvePileName(toValue(pileName))
    if (!active || pending || !pile) return
    const current = generation
    const request = getSceneDrillingCurveApi(pile, 1000)
    pending = request
    loading.value = true
    try {
      const response = await request
      if (!active || current !== generation) return
      data.value = parseDrillingCurve(response, pile)
      error.value = ''
    } catch {
      if (active && current === generation) {
        data.value = null
        error.value = '该孔曲线暂不可用，请重试'
      }
    } finally {
      if (pending === request) pending = undefined
      if (active && current === generation) loading.value = false
    }
  }

  function stop() {
    generation++
    clearInterval(timer)
    timer = undefined
    pending?.abort()
    pending = undefined
    loading.value = false
  }
  watch(
    () => normalizeCurvePileName(toValue(pileName)),
    (pile) => {
      stop()
      data.value = null
      error.value = ''
      if (active && pile) {
        void refresh()
        timer = setInterval(() => void refresh(), 20_000)
      }
    },
    { immediate: true, flush: 'sync' },
  )
  onBeforeUnmount(() => {
    active = false
    stop()
  })
  return { data, loading, error, refresh }
}
