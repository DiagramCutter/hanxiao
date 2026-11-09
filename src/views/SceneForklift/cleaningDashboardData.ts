import type { SlotCode, SlotStatusItem } from '@/interface/slot'

export interface MudMonitoringData {
  viscositySeconds: number | null
  densityGcm3: number | null
  sandContentPercent: number | null
  temperatureC: number | null
}

/** 仅新浆及累计换浆量保留演示值；其余数据由各自的 composable 请求真实接口。 */
export const cleaningDashboardData = {
  freshMud: {
    viscositySeconds: 38,
    densityGcm3: 1.04,
    sandContentPercent: 0.63,
    temperatureC: 28.8,
  } satisfies MudMonitoringData,
  cumulativeReplacementM3: 286.4,
}

// 三维部分沿用原模型及原孔位编号，仅提供固定展示状态，不调整模型定位算法。
// 顶部孔位已接入真实接口；三维部分按当前任务约定仍保留固定预览状态。
export const modelPreviewData: { pileName: SlotCode; slots: SlotStatusItem[] } = {
  pileName: 'S1-1',
  slots: [],
}

