import type { ResponseData } from './response'

export interface SceneCompletionData {
  completedSlotCount: number
  totalSlotCount: number
  accumulatedDepthM: number | null
}

export type SceneCompletionResponse = Omit<ResponseData<SceneCompletionData | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}

export interface SceneDailyExcavationData {
  unit: 'm'
  days: { date: string; excavatedDepthM: number }[]
}

export type SceneDailyExcavationResponse = Omit<
  ResponseData<SceneDailyExcavationData | null>,
  'msg'
> & {
  msg?: string
  message?: string
  success?: boolean
}

export interface SceneMudData {
  temp_mud: number | null
  density_mud: number | null
  viscosity_mud: number | null
  cs_mud: number | null
}

export type SceneMudResponse = Omit<ResponseData<SceneMudData | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}

export interface SceneMudSystemData {
  r10: number | null
  r11: number | null
  r12: number | null
  r13: number | null
  r14: number | null
  r15: number | null
  // 原始采集时间戳，秒/毫秒尚未约定，不转换为界面时间。
  serverTimeStamp: number | null
}

export type SceneMudSystemResponse = Omit<ResponseData<SceneMudSystemData | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}

export type SceneStayStatus =
  | 'STAYING'
  | 'CONFIRMING'
  | 'NO_DEPTH_DATA'
  | 'STALE_DATA'
  | 'HISTORY_LIMIT'

export interface SceneDrillingData {
  pileName: string | null
  holeDepthM: number | null
  stayDurationSeconds: number | null
  stayStatus: SceneStayStatus
  dipX: number | null
  dipY: number | null
  pfiX: number | null
  pfiY: number | null
  airFlowLeft: number | null
  airFlowRight: number | null
  updatedAt: string | null
}

export interface SceneDrillingCurvePoint {
  depthM: number
  dipXMm: number | null
  dipYMm: number | null
  updatedAt: string
}

export interface SceneDrillingCurveData {
  pileName: string
  depthUnit: 'm'
  offsetUnit: 'mm'
  totalPoints: number
  sampled: boolean
  points: SceneDrillingCurvePoint[]
}

export interface SceneDrillingCurvePayload extends Omit<SceneDrillingCurveData, 'totalPoints'> {
  // Java Long 的全局序列化规则会返回字符串，解析后统一为 number。
  totalPoints: number | string
}

export type SceneDrillingCurveResponse = Omit<
  ResponseData<SceneDrillingCurvePayload | null>,
  'msg'
> & {
  msg?: string
  message?: string
  success?: boolean
}

export type SceneDrillingResponse = Omit<ResponseData<SceneDrillingData | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}

export interface SceneProgressItem {
  pileName: string
  displayName: string
  currentDepthM: number | null
  finalDepthM: number | null
  progressPercent: number | null
  progressStatus: 'AVAILABLE' | 'NO_DEPTH_DATA'
  updatedAt: string | null
}

export interface SceneProgressData {
  items: SceneProgressItem[]
}

export type SceneProgressResponse = Omit<ResponseData<SceneProgressData | null>, 'msg'> & {
  msg?: string
  message?: string
  success?: boolean
}
