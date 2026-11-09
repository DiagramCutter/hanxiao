import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneProgressApi } from '@/api/scene'
import type { SceneProgressData } from '@/interface/scene'

const holes = [
  { pileName: 'S1-1', displayName: '1-p1' },
  { pileName: 'S1-2', displayName: '1-p2' },
  { pileName: 'S1-3', displayName: '1-p3' },
]
const numericValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export function useSceneProgress() {
  const progress = ref<SceneProgressData | null>(null)
  const error = ref('')
  const loading = ref(true)
  let active = false
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof getSceneProgressApi> | undefined

  // 按孔号匹配并固定三孔顺序；缺失孔保留空行，不补演示数据或自行计算百分比。
  const holeProgress = computed(() =>
    holes.map((hole) => {
      const item = progress.value?.items.find((entry) => entry.pileName === hole.pileName)
      const available = item?.progressStatus === 'AVAILABLE'
      const currentDepthM = available ? numericValue(item?.currentDepthM) : null
      const finalDepthM = numericValue(item?.finalDepthM)
      const percent = available ? numericValue(item?.progressPercent) : null
      return {
        pileName: hole.pileName,
        displayName:
          typeof item?.displayName === 'string' && item.displayName.trim()
            ? item.displayName.trim()
            : hole.displayName,
        currentDepthM,
        finalDepthM,
        progressPercent:
          currentDepthM !== null &&
          finalDepthM !== null &&
          finalDepthM > 0 &&
          percent !== null &&
          percent >= 0 &&
          percent <= 100
            ? percent
            : null,
      }
    }),
  )
  const caption = computed(() => {
    if (error.value) return '读取失败，重试中'
    if (loading.value) return progress.value ? '刷新中' : '加载中'
    const count = holeProgress.value.filter((hole) => hole.progressPercent !== null).length
    if (!count) return '暂无数据'
    return count === holes.length ? '每20秒刷新' : '部分暂无数据'
  })

  async function refresh() {
    if (!active || pending) return
    const request = getSceneProgressApi()
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
          (typeof result.data !== 'object' ||
            Array.isArray(result.data) ||
            !Array.isArray(result.data.items) ||
            result.data.items.some(
              (item) =>
                !item ||
                typeof item !== 'object' ||
                Array.isArray(item) ||
                typeof item.pileName !== 'string',
            )))
      ) {
        throw new Error('获取三孔清孔进度失败')
      }
      progress.value = result.data
      error.value = ''
    } catch {
      if (active) {
        progress.value = null
        error.value = '三孔清孔进度读取失败，将自动重试'
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

  return { progress, holeProgress, caption, loading, error, refresh }
}
