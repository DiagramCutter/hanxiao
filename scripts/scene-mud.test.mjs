import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createRenderer, h } from 'vue'
import { createServer } from 'vite'

// 运行真实 Vue 生命周期和回浆 composable，仅替换网络响应及计时器。
test('回浆首次请求、20 秒轮询、空值、失败恢复和卸载清理', async (t) => {
  const virtualApi = '\0test-mud-api'
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
    plugins: [
      {
        name: 'test-mud-api',
        resolveId(id) {
          if (id === '@/api/scene' || id === 'test-mud-api') return virtualApi
        },
        load(id) {
          if (id !== virtualApi) return
          return `
            export const requests = []
            export function getSceneMudApi() {
              let resolve, reject
              const promise = new Promise((yes, no) => { resolve = yes; reject = no })
              const request = { resolve, reject, aborted: false }
              promise.abort = () => {
                request.aborted = true
                reject(new Error('aborted'))
              }
              requests.push(request)
              return promise
            }
          `
        },
      },
    ],
  })
  t.after(() => server.close())
  const { requests } = await server.ssrLoadModule('test-mud-api')
  const { useSceneMud } = await server.ssrLoadModule('/src/views/SceneForklift/useSceneMud.ts')
  const renderer = createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    patchProp() {},
    parentNode: () => null,
    nextSibling: () => null,
  })
  t.mock.timers.enable({ apis: ['setInterval'] })
  let state
  const app = renderer.createApp({
    setup() {
      state = useSceneMud()
      return () => h('div')
    },
  })
  app.mount({})
  let unmounted = false
  t.after(() => {
    if (!unmounted) app.unmount()
  })
  const empty = {
    viscositySeconds: null,
    densityGcm3: null,
    sandContentPercent: null,
    temperatureC: null,
  }
  const sample = {
    temp_mud: 25.6,
    density_mud: 1.15,
    viscosity_mud: 22.5,
    cs_mud: 2.3,
  }
  const succeed = async (data) => {
    requests.at(-1).resolve({ code: 0, msg: 'success', data })
    await setImmediate()
  }

  assert.equal(requests.length, 1, '挂载后立即请求')
  assert.equal(state.loading.value, true)
  assert.deepEqual(state.mudData.value, empty, '首次请求前不展示演示值')
  await succeed(sample)
  assert.deepEqual(state.mudData.value, {
    viscositySeconds: 22.5,
    densityGcm3: 1.15,
    sandContentPercent: 2.3,
    temperatureC: 25.6,
  })
  assert.equal(state.caption.value, '每20秒刷新')
  t.mock.timers.tick(19_999)
  assert.equal(requests.length, 1)
  t.mock.timers.tick(1)
  assert.equal(requests.length, 2, '20 秒后发起下一次请求')
  t.mock.timers.tick(40_000)
  await state.refresh()
  assert.equal(requests.length, 2, '未完成请求期间不重复发送')
  await succeed({ temp_mud: 0, density_mud: null, viscosity_mud: 0, cs_mud: null })
  assert.deepEqual(state.mudData.value, { ...empty, viscositySeconds: 0, temperatureC: 0 })

  t.mock.timers.tick(20_000)
  requests.at(-1).reject(new Error('HTTP 500'))
  await setImmediate()
  assert.deepEqual(state.mudData.value, empty, '失败后不把旧数据冒充最新数据')
  assert.ok(state.error.value)
  assert.equal(state.loading.value, false)
  t.mock.timers.tick(20_000)
  await succeed(sample)
  assert.equal(state.error.value, '', '下一轮成功后恢复')
  assert.equal(state.mudData.value.temperatureC, 25.6)

  for (const payload of [
    { code: 1, msg: 'failed', data: sample },
    { code: 0, data: [] },
    { code: 0 },
    null,
  ]) {
    t.mock.timers.tick(20_000)
    requests.at(-1).resolve(payload)
    await setImmediate()
    assert.ok(state.error.value, '业务错误及无效响应进入失败状态')
    assert.deepEqual(state.mudData.value, empty)
  }
  for (const data of [null, { temp_mud: null, density_mud: null, viscosity_mud: null, cs_mud: null }]) {
    t.mock.timers.tick(20_000)
    await succeed(data)
    assert.equal(state.caption.value, '暂无数据')
    assert.equal(state.error.value, '')
  }

  t.mock.timers.tick(20_000)
  const lastRequest = requests.at(-1)
  const requestCount = requests.length
  app.unmount()
  unmounted = true
  assert.equal(lastRequest.aborted, true, '卸载取消进行中的请求')
  await setImmediate()
  t.mock.timers.tick(60_000)
  await state.refresh()
  assert.equal(requests.length, requestCount, '卸载后不再请求')
  assert.deepEqual(state.mudData.value, empty)
  assert.equal(state.error.value, '', '取消请求不回写卸载后的状态')
})
