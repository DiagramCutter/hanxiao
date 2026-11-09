import * as THREE from 'three'
import { slotDisplayOrder, type SlotCode } from '@/interface/slot'

// changdi020629 原始场地坐标：黄色九格的十道边界，方向为 S1 → S3。
// 坐标取自模型顶点，不受当前相机角度或场地 wrapper 旋转影响。
const slotBoundariesZ = [
  1.338959, 4.245124, 7.151249, 10.057379, 12.963510,
  15.869640, 18.775765, 21.681890, 24.588025, 27.494170,
]
const trenchAxisX = 21.14148
const groundY = -1.94129

// xitoujiglb 的 material8 是底部铣轮；使用其工作轴而不是整机包围盒中心。
const cutterAxis = new THREE.Vector3(-5.304758284, -1.664483527, 0.002397469)

export function normalizePileName(value: unknown): SlotCode | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return slotDisplayOrder.includes(code as SlotCode) ? (code as SlotCode) : null
}

export function getSlotModelPosition(pileName: unknown): THREE.Vector3 | null {
  const code = normalizePileName(pileName)
  if (!code) return null
  const index = slotDisplayOrder.indexOf(code)
  return new THREE.Vector3(
    trenchAxisX,
    groundY,
    (slotBoundariesZ[index]! + slotBoundariesZ[index + 1]!) / 2,
  )
}

export function createMachineSlotPlacement(
  site: THREE.Object3D,
  siteCenter: THREE.Vector3,
  machine: THREE.Object3D,
  machineCenter: THREE.Vector3,
) {
  const axisInMachine = cutterAxis.clone().sub(machineCenter)
  const originalAxis = machine.localToWorld(axisInMachine.clone())
  const originalGround = site.worldToLocal(originalAxis.clone()).add(siteCenter)
  originalGround.y = groundY
  const groundWorld = site.localToWorld(originalGround.sub(siteCenter))
  // 保留原来整机的离地高度，同时跟随场地轻微倾斜带来的地面高度变化。
  const heightAboveGround = machine.position.y - groundWorld.y

  return (pileName: unknown): SlotCode | null => {
    const code = normalizePileName(pileName)
    const localPosition = getSlotModelPosition(code)
    machine.visible = Boolean(localPosition)
    if (!localPosition) return null

    const target = site.localToWorld(localPosition.sub(siteCenter))
    const axisOffset = axisInMachine
      .clone()
      .multiply(machine.scale)
      .applyQuaternion(machine.quaternion)
    machine.position.set(
      target.x - axisOffset.x,
      target.y + heightAboveGround,
      target.z - axisOffset.z,
    )
    return code
  }
}
