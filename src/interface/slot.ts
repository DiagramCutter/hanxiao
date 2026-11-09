import type { ResponseData } from './response'

export type SlotStatus = 'NOT_STARTED' | 'EXCAVATING' | 'COMPLETED'

// 固定的是模型中的物理位置；名称和数据始终通过接口 code 对应。
export const slotDisplayOrder = [
  'S1-1', 'S1-3', 'S1-2',
  'S2-1', 'S2-3', 'S2-2',
  'S3-1', 'S3-3', 'S3-2',
] as const
export type SlotCode = (typeof slotDisplayOrder)[number]

export interface SlotStatusItem {
  code: SlotCode
  name: string
  sortOrder: number
  status: SlotStatus | null
  constructType: number | null
  /** 以下深度均以地面为零，向下为正，单位米；null 表示未知。 */
  designDepthM: number | null
  excavatedDepthM: number | null
  pouringBaseDepthM: number | null
  concreteTopDepthM: number | null
  updatedAt: string | null
}

export interface SceneSlotStatus {
  sceneId: string
  slots: SlotStatusItem[]
}

export const slotStatusLabels: Record<SlotStatus, string> = {
  NOT_STARTED: '未开始',
  EXCAVATING: '开挖',
  COMPLETED: '已完成',
}

export const slotStatusText = (status: SlotStatus | null | undefined) =>
  status ? slotStatusLabels[status] : '暂无状态'

export function slotDepthRange(slots: SlotStatusItem[]) {
  const depths = slots.flatMap((slot) => [slot.designDepthM, slot.excavatedDepthM])
  const maximum = depths.reduce<number>(
    (max, value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.max(max, value)
        : max,
    0,
  )
  return maximum > 0 ? Math.max(50, Math.ceil(maximum / 50) * 50) : 200
}

export type SceneSlotsResponse = Omit<ResponseData<SceneSlotStatus | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}
