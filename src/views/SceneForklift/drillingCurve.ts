import type { SceneDrillingCurveData, SceneDrillingCurvePoint } from '@/interface/scene'
import type { SlotCode } from '@/interface/slot'

export function normalizeCurvePileName(value: unknown): SlotCode | null {
  if (typeof value !== 'string') return null
  const name = value.trim().toUpperCase()
  return /^[SR][1-3]-[1-3]$/.test(name) ? (name.replace(/^R/, 'S') as SlotCode) : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function parseDrillingCurve(
  response: unknown,
  expectedPile: SlotCode,
): SceneDrillingCurveData {
  if (
    !isRecord(response) ||
    response.code !== 0 ||
    response.success === false ||
    !isRecord(response.data)
  ) {
    throw new Error('Invalid drilling curve response')
  }
  const data = response.data
  // 后端将 Long 序列化为十进制字符串；仅在接口边界转换，绘图数据仍使用数字。
  const totalPoints =
    typeof data.totalPoints === 'string' && /^\d+$/.test(data.totalPoints.trim())
      ? Number(data.totalPoints)
      : data.totalPoints
  if (
    normalizeCurvePileName(data.pileName) !== expectedPile ||
    data.depthUnit !== 'm' ||
    data.offsetUnit !== 'mm' ||
    !isFiniteNumber(totalPoints) ||
    !Number.isSafeInteger(totalPoints) ||
    totalPoints < 0 ||
    typeof data.sampled !== 'boolean' ||
    !Array.isArray(data.points) ||
    data.points.length > 5000 ||
    totalPoints < data.points.length ||
    (!data.sampled && totalPoints !== data.points.length) ||
    (data.sampled && (totalPoints <= data.points.length || data.points.length < 2))
  )
    throw new Error('Invalid drilling curve metadata')

  let previousDepth = -1
  const points = data.points.map((point): SceneDrillingCurvePoint => {
    if (
      !isRecord(point) ||
      !isFiniteNumber(point.depthM) ||
      point.depthM < 0 ||
      point.depthM <= previousDepth ||
      !(point.dipXMm === null || isFiniteNumber(point.dipXMm)) ||
      !(point.dipYMm === null || isFiniteNumber(point.dipYMm)) ||
      typeof point.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(point.updatedAt))
    )
      throw new Error('Invalid drilling curve point')
    previousDepth = point.depthM
    return {
      depthM: point.depthM,
      dipXMm: point.dipXMm,
      dipYMm: point.dipYMm,
      updatedAt: point.updatedAt,
    }
  })
  return {
    pileName: expectedPile,
    depthUnit: 'm',
    offsetUnit: 'mm',
    totalPoints,
    sampled: data.sampled,
    points,
  }
}

/** Keep out-of-range observations visible by expanding both axes. */
export function curveAxes(points: SceneDrillingCurvePoint[]) {
  let depth = 220
  let offset = 200
  for (const point of points) {
    depth = Math.max(depth, point.depthM)
    offset = Math.max(offset, Math.abs(point.dipXMm ?? 0), Math.abs(point.dipYMm ?? 0))
  }
  return { depth: Math.ceil(depth / 20) * 20, offset: Math.ceil(offset / 50) * 50 }
}

/** A missing offset breaks only its own series; zero remains an observed value. */
export function curveSegments(points: SceneDrillingCurvePoint[], field: 'dipXMm' | 'dipYMm') {
  const segments: { offset: number; depth: number }[][] = []
  let current: { offset: number; depth: number }[] = []
  for (const point of points) {
    const offset = point[field]
    if (offset === null) {
      if (current.length) segments.push(current)
      current = []
    } else current.push({ offset, depth: point.depthM })
  }
  if (current.length) segments.push(current)
  return segments
}
