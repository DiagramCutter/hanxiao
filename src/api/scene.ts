import type {
  SceneCompletionResponse,
  SceneDrillingResponse,
  SceneMudResponse,
  SceneMudSystemResponse,
  SceneProgressResponse,
  SceneDailyExcavationResponse,
  SceneDrillingCurveResponse,
} from '@/interface/scene'
import type { SceneSlotsResponse } from '@/interface/slot'
import { AlovaInstance } from '@/utils/alova'

export const getSceneCompletionApi = () =>
  AlovaInstance.Get<SceneCompletionResponse>('/scene/completion', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneDrillingCurveApi = (pileName: string, maxPoints = 1000) =>
  AlovaInstance.Get<SceneDrillingCurveResponse>('/scene/drilling-curve', {
    params: { pileName, maxPoints },
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneDailyExcavationApi = () =>
  AlovaInstance.Get<SceneDailyExcavationResponse>('/scene/daily-excavation', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneMudApi = () =>
  AlovaInstance.Get<SceneMudResponse>('/scene/mud', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    // 定时刷新失败由面板提示，避免每次轮询都弹出错误消息。
    meta: { silentError: true },
  })

export const getSceneMudSystemApi = () =>
  AlovaInstance.Get<SceneMudSystemResponse>('/scene/mud-system', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneDrillingApi = () =>
  AlovaInstance.Get<SceneDrillingResponse>('/scene/drilling', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneProgressApi = () =>
  AlovaInstance.Get<SceneProgressResponse>('/scene/progress', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })

export const getSceneSlotsApi = () =>
  AlovaInstance.Get<SceneSlotsResponse>('/scene/slots', {
    headers: { Accept: 'application/json' },
    cacheFor: 0,
    timeout: 15_000,
    shareRequest: false,
    meta: { silentError: true },
  })
