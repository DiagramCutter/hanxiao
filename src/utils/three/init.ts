import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const initThree = (dom: HTMLElement) => {
  const { width, height } = dom.getBoundingClientRect()
  const scene = new THREE.Scene()

  // 1. 修复：使用容器的宽高比，而不是窗口的
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 3000)

  const renderer = new THREE.WebGLRenderer({
    alpha: true, // 透明背景
    antialias: true, // 抗锯齿
  })

  // 2. 修复：设置设备像素比，防止高分屏模糊
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)
  dom.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  camera.position.set(0, 30, 30)
  controls.update()

  // 监听键盘按键，实现按住空格键 + 左键拖拽平移
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !event.repeat) {
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN
      // 改变光标样式提示用户
      dom.style.cursor = 'grab'
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
      dom.style.cursor = 'auto'
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // 3. 建议：添加基础灯光，防止物体全黑
  const ambientLight = new THREE.AmbientLight(0xffffff, 10)
  scene.add(ambientLight)
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 10)
  directionalLight1.position.set(-5.8, 18.8, 9)
  scene.add(directionalLight1)

  // 渲染循环

  // 记录动画ID以便取消
  let animationId: number
  const animate = function () {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // 4. 修复：添加 Resize 监听
  const onResize = () => {
    // 重新获取容器大小
    const { width, height } = dom.getBoundingClientRect()
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  window.addEventListener('resize', onResize)

  // 5. 修复：提供销毁方法
  const stopAnimate = () => {
    cancelAnimationFrame(animationId)
  }

  const dispose = () => {
    stopAnimate()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    controls.dispose()
    // 移除 DOM
    if (dom.contains(renderer.domElement)) {
      dom.removeChild(renderer.domElement)
    }
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    ambientLight,
    directionalLight1,
    stopAnimate,
    dispose,
  }
}
