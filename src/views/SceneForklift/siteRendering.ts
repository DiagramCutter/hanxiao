import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/** Outdoor fill light and contact shading, scoped to the construction overview. */
export function createSiteRendering(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  const sky = document.createElement('canvas')
  sky.width = 256
  sky.height = 128
  const context = sky.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 0, sky.height)
  gradient.addColorStop(0, '#9ab6d0')
  gradient.addColorStop(0.43, '#e1e8e9')
  gradient.addColorStop(0.5, '#e5e2d7')
  gradient.addColorStop(0.58, '#777d72')
  gradient.addColorStop(1, '#444b43')
  context.fillStyle = gradient
  context.fillRect(0, 0, sky.width, sky.height)
  const skyTexture = new THREE.CanvasTexture(sky)
  skyTexture.mapping = THREE.EquirectangularReflectionMapping
  skyTexture.colorSpace = THREE.SRGBColorSpace
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromEquirectangular(skyTexture)
  skyTexture.dispose()
  pmrem.dispose()
  const originalEnvironment = scene.environment
  const originalIntensity = scene.environmentIntensity

  let composer: EffectComposer | undefined
  let ao: GTAOPass | undefined
  let enabled = true
  // Some integrated GPUs cannot render half-float buffers. Material/light improvements
  // remain available there without allocating unsupported post-processing targets.
  if (renderer.extensions.has('EXT_color_buffer_float')) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: Math.min(4, renderer.capabilities.maxSamples),
    })
    composer = new EffectComposer(renderer, target)
    composer.addPass(new RenderPass(scene, camera))
    ao = new GTAOPass(scene, camera, 1, 1)
    ao.updateGtaoMaterial({
      radius: 3.2,
      thickness: 1.4,
      distanceFallOff: 1,
      scale: 1,
      samples: 12,
      screenSpaceRadius: false,
    })
    ao.updatePdMaterial({ radius: 4, rings: 2, samples: 8 })
    ao.blendIntensity = 0.8
    const renderAO = ao.render.bind(ao)
    ao.render = (activeRenderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
      // Photo vegetation and translucent status markers have no solid depth/normal.
      // Hide only in the AO geometry pass; the beauty pass keeps them visible.
      const hidden: THREE.Object3D[] = []
      scene.traverse((object) => {
        if (object.visible && (object instanceof THREE.Sprite || object.userData.excludeFromAO)) {
          hidden.push(object)
          object.visible = false
        }
      })
      const updateShadows = activeRenderer.shadowMap.autoUpdate
      activeRenderer.shadowMap.autoUpdate = false
      try {
        renderAO(activeRenderer, writeBuffer, readBuffer, deltaTime, maskActive)
      } finally {
        hidden.forEach((object) => (object.visible = true))
        activeRenderer.shadowMap.autoUpdate = updateShadows
      }
    }
    composer.addPass(ao)
    composer.addPass(new OutputPass())
  }

  function setEnabled(value: boolean) {
    enabled = value
    scene.environment = value ? environment.texture : originalEnvironment
    scene.environmentIntensity = value ? 0.35 : originalIntensity
  }
  setEnabled(true)
  return {
    setEnabled,
    setSize(width: number, height: number) {
      composer?.setSize(width, height)
    },
    render(delta: number) {
      if (enabled && composer) composer.render(delta)
      else renderer.render(scene, camera)
    },
    dispose() {
      scene.environment = originalEnvironment
      scene.environmentIntensity = originalIntensity
      composer?.passes.forEach((pass) => pass.dispose())
      composer?.dispose()
      environment.dispose()
    },
  }
}
