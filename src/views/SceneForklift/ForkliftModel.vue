<template>
  <div
    ref="container"
    class="site-viewport"
    v-loading="loading"
    element-loading-text="正在载入施工现场…"
    element-loading-background="#081a2ce6"
  >
    <div v-if="failure" class="model-message" role="alert">
      {{ failure }}<button @click="reload">重新加载</button>
    </div>
    <div v-if="!loading && !failure && showLabels" class="site-labels">
      <div
        v-for="label in labels"
        :key="label.id"
        class="site-label"
        :class="{ selected: label.selected }"
        :style="{ left: label.x + '%', top: label.y + '%' }"
      >
        <span>{{ label.text }}</span
        ><i></i>
      </div>
    </div>
    <div class="scene-corner">
      <span class="orientation"><small>N</small>➤</span>
      <div class="scene-legend">
        <span><i></i>已完成</span><span><i></i>施工中</span><span><i></i>待施工</span>
      </div>
    </div>
    <span v-if="environment && !loading && !failure" class="environment-note">绿化示意</span>
  </div>
</template>

<script setup lang="ts">
import { vLoading } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import { initThree } from '@/utils/three/init'
import { createGLTFLoader } from '@/utils/three/gltfLoader'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import {
  createMachineSlotPlacement,
  getSlotModelPosition,
  normalizePileName,
} from './machinePlacement'
import { createSiteRendering } from './siteRendering'
import { createSiteEnvironment } from './siteEnvironment'
import { enhanceSiteMaterials } from './siteMaterials'
import { slotDisplayOrder, type SlotCode, type SlotStatusItem } from '@/interface/slot'

const props = defineProps<{
  pileName: string | null
  selectedCode: SlotCode | null
  slots: SlotStatusItem[]
  environment: boolean
  showLabels: boolean
  enhanced: boolean
}>()
const emit = defineEmits<{ loaded: [value: boolean] }>()
const container = ref<HTMLElement | null>(null)
const loading = ref(true)
const failure = ref('')
const labels = ref<{ id: string; text: string; x: number; y: number; selected?: boolean }[]>([])
let mounted = false
let cleanup: (() => void) | undefined
let frameScene: (() => void) | undefined
let updateSelection: (() => void) | undefined
let updateMachine: (() => void) | undefined
let updateRendering: (() => void) | undefined
let environmentGroup: THREE.Group | undefined
const loader = createGLTFLoader()
const disposed = new WeakSet<object>()
function disposeOnce(resource: { dispose(): void }) {
  if (disposed.has(resource)) return
  disposed.add(resource)
  resource.dispose()
}
function release(model: THREE.Object3D) {
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      disposeOnce(object.geometry)
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) disposeOnce(value)
        })
        disposeOnce(material)
      })
    }
    if (object instanceof THREE.SkinnedMesh) disposeOnce(object.skeleton)
  })
  model.removeFromParent()
}
function centered(model: THREE.Object3D, referenceCenter?: THREE.Vector3) {
  const center =
    referenceCenter?.clone() ?? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
  const wrapper = new THREE.Group()
  model.position.sub(center)
  wrapper.add(model)
  return { wrapper, center }
}
watch(
  () => props.pileName,
  () => {
    updateMachine?.()
    updateSelection?.()
  },
)
watch(
  () => [props.selectedCode, props.slots],
  () => updateSelection?.(),
  { deep: true },
)
watch(
  () => props.environment,
  (visible) => {
    if (environmentGroup) environmentGroup.visible = visible
  },
)
defineExpose({ resetView: () => frameScene?.() })
watch(
  () => props.enhanced,
  () => updateRendering?.(),
)

async function initScene() {
  if (!container.value) return
  loading.value = true
  failure.value = ''
  emit('loaded', false)
  const runtime = initThree(container.value)
  const { scene, camera, renderer, controls, ambientLight, directionalLight1 } = runtime
  runtime.stopAnimate()
  const resources: THREE.Object3D[] = []
  let cleanupOverlays: (() => void) | undefined
  let cleanupEnvironment: (() => void) | undefined
  let materialEnhancement: ReturnType<typeof enhanceSiteMaterials> | undefined
  let rendering: ReturnType<typeof createSiteRendering> | undefined
  let resize: ResizeObserver | undefined
  let animationFrame = 0
  let mixer: THREE.AnimationMixer | undefined
  let machineRoot: THREE.Object3D | undefined
  let cancelled = false
  const clock = new THREE.Clock()
  controls.enabled = false
  controls.enableDamping = false
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  scene.background = new THREE.Color('#0b2030')
  ambientLight.intensity = 0.85
  directionalLight1.intensity = 1.65
  directionalLight1.position.set(100, 350, 130)
  directionalLight1.castShadow = true
  const shadowSize = Math.min(4096, renderer.capabilities.maxTextureSize)
  directionalLight1.shadow.mapSize.set(shadowSize, shadowSize)
  Object.assign(directionalLight1.shadow.camera, {
    left: -350,
    right: 350,
    top: 350,
    bottom: -350,
    near: 1,
    far: 1200,
  })
  directionalLight1.shadow.bias = -0.0005
  const hemisphere = new THREE.HemisphereLight('#e3f3ff', '#4b5650', 1)
  scene.add(hemisphere)
  cleanup = () => {
    cancelled = true
    resize?.disconnect()
    cancelAnimationFrame(animationFrame)
    mixer?.stopAllAction()
    if (machineRoot) mixer?.uncacheRoot(machineRoot)
    rendering?.dispose()
    materialEnhancement?.dispose()
    cleanupOverlays?.()
    cleanupEnvironment?.()
    resources.forEach(release)
    directionalLight1.shadow.map?.dispose()
    ambientLight.dispose()
    directionalLight1.dispose()
    hemisphere.dispose()
    runtime.dispose()
    scene.clear()
    frameScene = updateSelection = updateMachine = updateRendering = undefined
    environmentGroup = undefined
  }
  try {
    const site = await loader.loadAsync('/models/hcangdi2-compressed.glb?v=20261023')
    if (cancelled || !mounted) {
      site.scenes.forEach(release)
      return
    }
    resources.push(...site.scenes)
    // The revised export moves and rotates the whole compound. Restore the
    // original site's datum so slot coordinates, labels and the machine align.
    site.scene.updateMatrixWorld(true)
    const siteDatum = site.scene.getObjectByName('231')
    if (!siteDatum) throw new Error('场地模型缺少坐标基准节点 231')
    site.scene.applyMatrix4(siteDatum.matrixWorld.clone().invert())
    site.scene.updateMatrixWorld(true)
    // Keep the old compressed site's calibrated origin. Recentring on the new
    // layout bounds would change the machine's ground-height calibration.
    const { wrapper, center } = centered(
      site.scene,
      new THREE.Vector3(12.353393, -0.032455, 0.000004),
    )
    wrapper.position.set(85, 35, 85)
    wrapper.rotation.set(0.018407, -0.801592653589793, 0.018407346410207)
    wrapper.scale.setScalar(3)
    scene.add(wrapper)
    materialEnhancement = enhanceSiteMaterials(site.scene, renderer)
    rendering = createSiteRendering(renderer, scene, camera)
    site.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.receiveShadow = true
        // Large ground meshes need not populate the shadow map.
        node.castShadow = !node.name.startsWith('Line21312633') && node.name !== 'Line2131263297'
      }
    })
    // The revised site is already back in its original coordinate system.
    // Apply the same centring offset to the independent exterior environment.
    const environment = createSiteEnvironment()
    environmentGroup = environment.group
    environment.group.position.copy(center).negate()
    environment.group.visible = props.environment
    wrapper.add(environment.group)
    cleanupEnvironment = environment.dispose
    const lightDirection = new THREE.Vector3(-0.7, 1.25, 0.65)
      .normalize()
      .applyQuaternion(wrapper.quaternion)
    updateRendering = () => {
      const enhanced = props.enhanced
      ambientLight.intensity = enhanced ? 0.2 : 0.85
      hemisphere.intensity = enhanced ? 0.5 : 1
      hemisphere.color.set(enhanced ? '#d9e7f4' : '#e3f3ff')
      directionalLight1.color.set(enhanced ? '#fff2dc' : '#ffffff')
      directionalLight1.intensity = enhanced ? 2.45 : 1.65
      renderer.toneMappingExposure = enhanced ? 0.84 : 0.9
      if (enhanced) {
        directionalLight1.position
          .copy(directionalLight1.target.position)
          .addScaledVector(lightDirection, 600)
      } else directionalLight1.position.set(100, 350, 130)
      const extent = enhanced ? 245 : 350
      Object.assign(directionalLight1.shadow.camera, {
        left: -extent,
        right: extent,
        top: extent,
        bottom: -extent,
      })
      directionalLight1.shadow.camera.updateProjectionMatrix()
      directionalLight1.shadow.bias = enhanced ? -0.00008 : -0.0005
      directionalLight1.shadow.normalBias = enhanced ? 0.09 : 0
      directionalLight1.shadow.needsUpdate = true
      materialEnhancement?.setEnabled(enhanced)
      environment.setEnhanced(enhanced)
      rendering?.setEnabled(enhanced)
    }

    const overlays = new THREE.Group()
    overlays.userData.excludeFromAO = true
    overlays.position.copy(center).negate()
    wrapper.add(overlays)
    resources.push(overlays)
    const workArea = new THREE.Shape()
    workArea.moveTo(-2.05, -13.55)
    workArea.lineTo(2.05, -13.55)
    workArea.lineTo(2.05, 13.55)
    workArea.lineTo(-2.05, 13.55)
    workArea.closePath()
    const innerArea = new THREE.Path()
    innerArea.moveTo(-1.85, -13.35)
    innerArea.lineTo(-1.85, 13.35)
    innerArea.lineTo(1.85, 13.35)
    innerArea.lineTo(1.85, -13.35)
    innerArea.closePath()
    workArea.holes.push(innerArea)
    const workAreaOutline = new THREE.Mesh(
      new THREE.ShapeGeometry(workArea),
      new THREE.MeshBasicMaterial({
        color: '#36e4ef',
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    workAreaOutline.rotation.x = -Math.PI / 2
    workAreaOutline.position.set(21.14148, -1.79, 14.41656)
    overlays.add(workAreaOutline)
    const slotMeshes = slotDisplayOrder.map((code) => {
      const position = getSlotModelPosition(code)!
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 2.72),
        new THREE.MeshBasicMaterial({
          color: '#416474',
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      mesh.rotation.x = -Math.PI / 2
      mesh.position.copy(position).add(new THREE.Vector3(0, 0.09, 0))
      overlays.add(mesh)
      return mesh
    })
    const selection = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.35, 0, -1.43),
        new THREE.Vector3(1.35, 0, -1.43),
        new THREE.Vector3(1.35, 0, 1.43),
        new THREE.Vector3(-1.35, 0, 1.43),
      ]),
      new THREE.LineBasicMaterial({ color: '#ffd27a', depthTest: false }),
    )
    selection.renderOrder = 5
    overlays.add(selection)
    // Line objects are not Mesh objects, so dispose these explicitly.
    cleanupOverlays = () => {
      selection.geometry.dispose()
      ;(selection.material as THREE.Material).dispose()
    }

    const projectLabel = (id: string, text: string, point: THREE.Vector3, selected = false) => {
      const world = wrapper.localToWorld(point.clone().sub(center)).project(camera)
      return { id, text, x: (world.x + 1) * 50, y: (1 - world.y) * 50, selected }
    }
    const updateLabels = () => {
      const chosen = props.selectedCode ?? normalizePileName(props.pileName)
      const items = [
        projectLabel('materials', '材料堆场', new THREE.Vector3(22.3, 0.5, 50.6)),
        projectLabel('rebar', '钢筋加工区', new THREE.Vector3(-7.73, 0, 27.52)),
        projectLabel('service', '现场配套区', new THREE.Vector3(-19.48, 1.4, 14.15)),
      ]
      const point = getSlotModelPosition(chosen)
      if (!point)
        items.push(projectLabel('work-area', '槽孔作业区', new THREE.Vector3(21.14, -0.9, 14.42)))
      if (point)
        items.push(
          projectLabel(
            'slot',
            `${chosen} · ${chosen === normalizePileName(props.pileName) ? '当前机位' : '选中槽孔'}`,
            point.add(new THREE.Vector3(0, 1, 0)),
            true,
          ),
        )
      labels.value = items.filter((item) => item.x > 3 && item.x < 97 && item.y > 10 && item.y < 92)
    }
    updateSelection = () => {
      const chosen = props.selectedCode ?? normalizePileName(props.pileName)
      const point = getSlotModelPosition(chosen)
      selection.visible = Boolean(point)
      if (point) selection.position.copy(point).add(new THREE.Vector3(0, 0.2, 0))
      slotMeshes.forEach((mesh, i) => {
        const status = props.slots.find((slot) => slot.code === slotDisplayOrder[i])?.status
        mesh.material.color.set(
          status === 'COMPLETED' ? '#36d7c3' : status === 'EXCAVATING' ? '#f2ba5b' : '#537d91',
        )
      })
      updateLabels()
    }
    frameScene = () => {
      if (!container.value || cancelled) return
      const { width, height } = container.value.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.fov = 40
      camera.near = 1
      camera.far = 4000
      wrapper.updateMatrixWorld(true)
      const target = wrapper.localToWorld(new THREE.Vector3(12, -1.9, 18).sub(center))
      const direction = new THREE.Vector3(1, 1.65, -0.17)
        .normalize()
        .applyQuaternion(wrapper.quaternion)
      camera.position.copy(target).addScaledVector(direction, 1000)
      camera.lookAt(target)
      const inverse = camera.quaternion.clone().invert()
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const tanH = tanV * camera.aspect
      let distance = 0
      for (const x of [-38, 48])
        for (const y of [-2, 9])
          for (const z of [-49, 84]) {
            const point = wrapper
              .localToWorld(new THREE.Vector3(x, y, z).sub(center))
              .sub(target)
              .applyQuaternion(inverse)
            distance = Math.max(
              distance,
              Math.abs(point.x) / (tanH * 0.93) + point.z,
              Math.abs(point.y) / (tanV * 0.84) + point.z,
            )
          }
      camera.position.copy(target).addScaledVector(direction, distance * 0.61)
      camera.lookAt(target)
      camera.updateMatrixWorld(true)
      // Lift the composition to leave room for the bottom toolbar without changing world coordinates.
      camera.setViewOffset(width, height, 0, height * 0.035, width, height)
      camera.updateProjectionMatrix()
      controls.target.copy(target)
      controls.update()
      renderer.setSize(width, height)
      rendering?.setSize(width, height)
      directionalLight1.target.position.copy(target)
      scene.add(directionalLight1.target)
      updateRendering?.()
      updateLabels()
    }
    resize = new ResizeObserver(() => frameScene?.())
    resize.observe(container.value)
    frameScene()
    updateSelection()
    const animate = () => {
      if (cancelled) return
      const delta = Math.min(clock.getDelta(), 0.1)
      mixer?.update(delta)
      controls.update()
      rendering?.render(delta)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()
    loading.value = false
    emit('loaded', true)

    // The site remains usable if the secondary machine model fails.
    try {
      const machine = await loader.loadAsync('/models/xitoujiglb-compressed.glb')
      if (cancelled || !mounted) {
        machine.scenes.forEach(release)
        return
      }
      resources.push(...machine.scenes)
      machineRoot = machine.scene
      machine.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true
          object.receiveShadow = true
        }
      })
      const { wrapper: machineWrapper, center: machineCenter } = centered(machine.scene)
      machineWrapper.position.set(60.17999, 50.22535, 159.87)
      machineWrapper.rotation.set(0, -0.882, 0)
      machineWrapper.scale.setScalar(2)
      scene.add(machineWrapper)
      const place = createMachineSlotPlacement(wrapper, center, machineWrapper, machineCenter)
      updateMachine = () => place(props.pileName)
      updateMachine()
      if (machine.animations.length) {
        mixer = new THREE.AnimationMixer(machine.scene)
        machine.animations.forEach((clip) => mixer!.clipAction(clip).play())
      }
    } catch (error) {
      if (!cancelled) console.warn('施工机模型暂未加载，保留场地总览', error)
    }
  } catch (error) {
    if (!cancelled) {
      failure.value = '场地模型加载失败，请重试'
      loading.value = false
      console.error('场地模型加载失败', error)
    }
  }
}
function reload() {
  cleanup?.()
  void initScene()
}
onMounted(() => {
  mounted = true
  void initScene()
})
onUnmounted(() => {
  mounted = false
  cleanup?.()
})
</script>

<style scoped>
.site-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.site-viewport :deep(canvas) {
  display: block;
}
.site-viewport::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 48%, transparent 55%, #00172520 82%, #00172566 100%);
  pointer-events: none;
}
.site-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.site-label {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
  flex-direction: column;
  font-size: calc(14 * var(--u, 1px));
  color: #e3f7ff;
  white-space: nowrap;
}
.site-label span {
  padding: calc(4 * var(--u, 1px)) calc(12 * var(--u, 1px));
  border: 1px solid #4793af;
  border-radius: 4px;
  background: #071d2deb;
  box-shadow: 0 4px 15px #0005;
}
.site-label i {
  display: block;
  height: calc(35 * var(--u, 1px));
  width: 1px;
  background: #72d8ee;
  position: relative;
}
.site-label i::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a4efff;
  box-shadow: 0 0 0 4px #57cae840;
  position: absolute;
  bottom: -3px;
  left: -2.5px;
}
.site-label.selected span {
  border-color: #d5a85d;
  color: #ffe0a3;
}
.scene-corner {
  position: absolute;
  bottom: calc(21 * var(--u, 1px));
  left: calc(28 * var(--u, 1px));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(24 * var(--u, 1px));
  color: #9cb5c5;
  font-size: 11px;
  pointer-events: none;
  z-index: 1;
}
.orientation {
  display: grid;
  place-items: center;
  width: calc(48 * var(--u, 1px));
  height: calc(48 * var(--u, 1px));
  border: 1px solid #4c7485;
  border-radius: 50%;
  color: #60d1e5;
  font-size: calc(35 * var(--u, 1px));
  background: #081c2bc9;
  transform: rotate(-90deg);
}
.orientation small {
  position: absolute;
  right: calc(-17 * var(--u, 1px));
  font-size: calc(13 * var(--u, 1px));
  transform: rotate(90deg);
  color: #d7ecf4;
}
.scene-legend {
  display: flex;
  gap: calc(18 * var(--u, 1px));
  font-size: calc(12 * var(--u, 1px));
  color: #e1f5ff;
  text-shadow: 0 1px 4px #00131d;
}
.scene-legend span {
  display: flex;
  align-items: center;
  gap: calc(6 * var(--u, 1px));
}
.scene-legend i {
  width: calc(13 * var(--u, 1px));
  height: calc(13 * var(--u, 1px));
  background: #21dcd0;
}
.scene-legend span:nth-child(2) i {
  background: #ffbd47;
}
.scene-legend span:nth-child(3) i {
  background: #5b7890;
}
.environment-note {
  position: absolute;
  right: 16px;
  bottom: 20px;
  color: #a4b9c3;
  font-size: calc(10 * var(--u, 1px));
  background: #0b2030bb;
  padding: 3px 6px;
  pointer-events: none;
  z-index: 1;
}
.model-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #c6dbe7;
  font-size: 14px;
  z-index: 1;
}
.model-message button {
  padding: 8px 16px;
  border-radius: 4px;
  background: #16394e;
  border: 1px solid #397b92;
  color: #bff2ff;
  cursor: pointer;
}
@media (max-width: 1200px) {
  .site-label {
    font-size: 10px;
  }
  .site-label span {
    padding: 5px 7px;
  }
  .environment-note {
    bottom: 58px;
  }
}
</style>
