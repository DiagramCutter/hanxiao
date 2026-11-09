import {
  slotDisplayOrder,
  type SceneSlotsResponse,
  type SceneSlotStatus,
  type SlotStatus,
} from '@/interface/slot'

const depthValue = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/** 校验固定九铣及稳定编号，不使用模拟记录补齐失败的接口。 */
export function parseSceneSlotStatus(result: SceneSlotsResponse): SceneSlotStatus {
  if (result.code !== 0 || result.success === false) {
    throw new Error(result.msg || result.message || '获取槽孔实时数据失败')
  }
  if (
    result.data?.sceneId !== 'scene-02' ||
    !Array.isArray(result.data.slots) ||
    result.data.slots.length !== slotDisplayOrder.length
  ) {
    throw new Error('槽孔数据格式不正确')
  }
  const seen = new Set<string>()
  const slots = result.data.slots.map((slot) => {
    if (
      !slot ||
      !slotDisplayOrder.includes(slot.code) ||
      seen.has(slot.code) ||
      typeof slot.name !== 'string' ||
      !slot.name.trim() ||
      !Number.isInteger(slot.sortOrder) ||
      slot.sortOrder < 1 ||
      slot.sortOrder > 9
    ) {
      throw new Error('槽孔编号或名称不正确')
    }
    seen.add(slot.code)
    const status: SlotStatus | null =
      slot.status === 'NOT_STARTED' ||
      slot.status === 'EXCAVATING' ||
      slot.status === 'COMPLETED'
        ? slot.status
        : null
    return {
      code: slot.code,
      name: slot.name,
      sortOrder: slot.sortOrder,
      status,
      constructType: Number.isInteger(slot.constructType) ? slot.constructType : null,
      designDepthM: depthValue(slot.designDepthM),
      excavatedDepthM: depthValue(slot.excavatedDepthM),
      pouringBaseDepthM: depthValue(slot.pouringBaseDepthM),
      concreteTopDepthM: depthValue(slot.concreteTopDepthM),
      updatedAt:
        typeof slot.updatedAt === 'string' && Number.isFinite(Date.parse(slot.updatedAt))
          ? slot.updatedAt
          : null,
    }
  })
  return { sceneId: result.data.sceneId, slots }
}
