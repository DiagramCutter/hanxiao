import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getSceneMudSystemApi } from '@/api/scene'
import type { SceneMudSystemData } from '@/interface/scene'

const fields = [
  { id: 'r10', name: '制浆池浆量' },
  { id: 'r11', name: '膨化池浆量' },
  { id: 'r12', name: '储浆池浆量' },
  { id: 'r13', name: '回浆池浆量' },
  { id: 'r14', name: '泥浆箱浆量' },
  { id: 'r15', name: '槽孔泥浆面' },
] satisfies { id: Exclude<keyof SceneMudSystemData, 'serverTimeStamp'>; name: string }[]

// 当前页面只展示四项储量；r13 为回浆池库存，r15 为槽孔泥浆面。
const storageFields = new Set(['r10', 'r11', 'r12', 'r14'])

function formatValue(value: unknown) {
  // 保留接口原值，不做倍率换算；空值不能当成 0。
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return value.trim()
  return '--'
}

export function useSceneMudSystem() {
  const data = ref<SceneMudSystemData | null>(null)
  const loading = ref(true)
  const error = ref('')
  let active = false
  let pending: ReturnType<typeof getSceneMudSystemApi> | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  const items = computed(() =>
    fields.map((field) => ({ ...field, value: formatValue(data.value?.[field.id]) })),
  )
  const storageItems = computed(() => items.value.filter((field) => storageFields.has(field.id)))
  const caption = computed(() => {
    if (error.value) return '读取失败，重试中'
    if (loading.value) return data.value ? '刷新中' : '加载中'
    return storageItems.value.some((item) => item.value !== '--') ? '每20秒刷新' : '暂无数据'
  })

  async function refresh() {
    if (!active || pending) return
    loading.value = true
    const request = getSceneMudSystemApi()
    pending = request
    try {
      const result = await request
      if (!active) return
      if (
        result?.code !== 0 ||
        result.success === false ||
        (result.data !== null && (typeof result.data !== 'object' || Array.isArray(result.data)))
      ) {
        throw new Error('Invalid mud system response')
      }
      data.value = result.data ?? null
      error.value = ''
    } catch {
      if (active) {
        data.value = null
        error.value = '泥浆储量读取失败，将自动重试'
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

  return { items, storageItems, caption, loading, error }
}
