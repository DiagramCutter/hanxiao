import * as THREE from 'three'
import treeTextureUrl from '@/assets/sceneForklift/tree-billboard.png'
import woodlandTextureUrl from '@/assets/sceneForklift/woodland-cluster.png'

/** 独立的展示环境，使用场地原始坐标；不修改 GLB 或真实施工设施。 */
export function createSiteEnvironment() {
  const group = new THREE.Group()
  group.name = 'presentation-environment'
  const textures: THREE.Texture[] = []
  let disposed = false
  let seed = 417
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')!
  context.fillStyle = '#354035'
  context.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 14000; i++) {
    context.fillStyle = ['#62634d', '#283b2d', '#696550', '#42523b'][i % 4]!
    context.globalAlpha = 0.3 + random() * 0.4
    context.fillRect(random() * 256, random() * 256, 1, 1 + random() * 3)
  }
  const grass = new THREE.CanvasTexture(canvas)
  grass.colorSpace = THREE.SRGBColorSpace
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping
  grass.repeat.set(35, 35)
  textures.push(grass)

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: grass,
    color: '#b7b5a4',
    roughness: 1,
  })
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#35414a', roughness: 1 })
  const curbMaterial = new THREE.MeshStandardMaterial({ color: '#83918e', roughness: 1 })
  const lineMaterial = new THREE.MeshBasicMaterial({ color: '#acb7b4' })
  // Use a separate seed so changing material detail never relocates existing planting.
  let detailSeed = 17041
  const detailRandom = () => {
    detailSeed = (detailSeed * 1664525 + 1013904223) >>> 0
    return detailSeed / 4294967296
  }
  function noiseGrid(size: number) {
    const values = Float32Array.from({ length: size * size }, () => detailRandom())
    return (u: number, v: number) => {
      const x = u * size
      const y = v * size
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const smooth = (t: number) => t * t * (3 - 2 * t)
      const tx = smooth(x - ix)
      const ty = smooth(y - iy)
      const sample = (sx: number, sy: number) => values[(sy % size) * size + (sx % size)]!
      return THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(sample(ix, iy), sample(ix + 1, iy), tx),
        THREE.MathUtils.lerp(sample(ix, iy + 1), sample(ix + 1, iy + 1), tx),
        ty,
      )
    }
  }
  function surfaceMaps(base: [number, number, number], soil: boolean) {
    const size = 256
    const broad = noiseGrid(8)
    const fine = noiseGrid(32)
    const channels = Array.from({ length: 3 }, () => {
      const surface = document.createElement('canvas')
      surface.width = surface.height = size
      const drawing = surface.getContext('2d')!
      return { surface, drawing, pixels: drawing.createImageData(size, size) }
    })
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const low = broad(x / size, y / size) - 0.5
        const high = fine(x / size, y / size) - 0.5
        const grain = detailRandom() - 0.5
        const variation = low * (soil ? 10 : 12) + high * 8 + grain * (soil ? 12 : 21)
        const height = 128 + high * 24 + grain * 40 + low * (soil ? 12 : 8)
        const roughness = 242 + high * 14 + grain * 12
        const offset = (y * size + x) * 4
        for (let channel = 0; channel < 3; channel++) {
          channels[0]!.pixels.data[offset + channel] = base[channel]! + variation
          channels[1]!.pixels.data[offset + channel] = height
          channels[2]!.pixels.data[offset + channel] = roughness
        }
        channels.forEach(({ pixels }) => (pixels.data[offset + 3] = 255))
      }
    }
    return channels.map(({ surface, drawing, pixels }, index) => {
      drawing.putImageData(pixels, 0, 0)
      const texture = new THREE.CanvasTexture(surface)
      if (index === 0) texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.anisotropy = 4
      textures.push(texture)
      return texture
    })
  }
  const [soilColor, soilHeight, soilRoughness] = surfaceMaps([57, 65, 45], true)
  const [roadColor, roadHeight, roadRoughness] = surfaceMaps([58, 65, 69], false)
  const enhancedGround = new THREE.MeshStandardMaterial({
    map: soilColor,
    bumpMap: soilHeight,
    bumpScale: 0.035,
    roughnessMap: soilRoughness,
    roughness: 1,
  })
  const enhancedRoad = new THREE.MeshStandardMaterial({
    map: roadColor,
    bumpMap: roadHeight,
    bumpScale: 0.008,
    roughnessMap: roadRoughness,
    roughness: 0.98,
  })
  const enhancedCurb = new THREE.MeshStandardMaterial({
    color: '#83918e',
    bumpMap: roadHeight,
    bumpScale: 0.005,
    roughness: 0.96,
  })
  const surfaceOverrides: {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>
    original: THREE.Material
    enhanced: THREE.Material
    originalUV: Float32Array
    enhancedUV: Float32Array
  }[] = []
  const surfaceMaterials = new Map<THREE.Material, { material: THREE.Material; tileSize: number }>([
    [groundMaterial, { material: enhancedGround, tileSize: 4 }],
    [roadMaterial, { material: enhancedRoad, tileSize: 2 }],
    [curbMaterial, { material: enhancedCurb, tileSize: 1 }],
  ])
  // The site's paved surface is at y = -1.94129. Keep exterior dressing just above
  // the original soil so it is visible, while staying outside the compound walls.
  const groundY = -1.9
  function plane(w: number, h: number, x: number, z: number, y: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, y, z)
    mesh.receiveShadow = true
    const surface = surfaceMaterials.get(material)
    if (surface) {
      const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute
      const originalUV = new Float32Array(uv.array)
      const enhancedUV = originalUV.slice()
      for (let i = 0; i < uv.count; i++) {
        enhancedUV[i * 2] = originalUV[i * 2]! * (w / surface.tileSize)
        enhancedUV[i * 2 + 1] = originalUV[i * 2 + 1]! * (h / surface.tileSize)
      }
      surfaceOverrides.push({
        mesh,
        original: material,
        enhanced: surface.material,
        originalUV,
        enhancedUV,
      })
    }
    group.add(mesh)
    return mesh
  }

  // Only place environment outside the compound; keep site paving and gate access intact.
  // Extend beneath the whole view so no rectangular presentation base is exposed.
  plane(420, 420, 2, 6, -7.25, groundMaterial)
  plane(20, 180, -42, 16, groundY, groundMaterial)
  plane(15, 149, 49, 16, groundY, groundMaterial)
  plane(92, 13, 3, 82, groundY, groundMaterial)
  plane(92, 13, 3, -48, groundY, groundMaterial)
  plane(5, 180, -29, 14, groundY + 0.03, roadMaterial)
  plane(4, 180, 42, 14, groundY + 0.03, roadMaterial)
  plane(82, 7, 4.5, 75, groundY + 0.03, roadMaterial)
  plane(82, 7, 4.5, -41, groundY + 0.03, roadMaterial)
  for (const x of [-31.6, -26.4, 39.9, 44.1]) plane(0.2, 150, x, 17, groundY + 0.05, curbMaterial)
  for (let z = -39; z < 76; z += 7) {
    for (const x of [-29, 42]) plane(0.1, 3, x, z, groundY + 0.06, lineMaterial)
  }
  for (let x = -30; x < 42; x += 7) {
    for (const z of [-41, 75]) plane(3, 0.14, x, z, groundY + 0.06, lineMaterial)
  }

  const trees = new THREE.Group()
  group.add(trees)
  const foliageMaterials: THREE.SpriteMaterial[] = []
  const foliageColors: THREE.Color[] = []
  function foliage(url: string, colors: string[]) {
    const map = new THREE.TextureLoader().load(url, (texture) => {
      if (disposed) texture.dispose()
    })
    map.colorSpace = THREE.SRGBColorSpace
    textures.push(map)
    return colors.map((color) => {
      const material = new THREE.SpriteMaterial({
        map,
        color,
        alphaTest: 0.16,
        depthWrite: false,
        toneMapped: false,
      })
      foliageMaterials.push(material)
      foliageColors.push(material.color.clone())
      return material
    })
  }
  const singleTrees = foliage(treeTextureUrl, ['#bcc6b0', '#adbfa9', '#d0d1b9'])
  const woodlands = foliage(woodlandTextureUrl, ['#b7c2a8', '#c5c8b2', '#a9b6a0', '#c5c3ab'])
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 64
  const shadowContext = shadowCanvas.getContext('2d')!
  const gradient = shadowContext.createRadialGradient(32, 32, 4, 32, 32, 31)
  gradient.addColorStop(0, '#00000088')
  gradient.addColorStop(1, '#00000000')
  shadowContext.fillStyle = gradient
  shadowContext.fillRect(0, 0, 64, 64)
  const shadowMap = new THREE.CanvasTexture(shadowCanvas)
  textures.push(shadowMap)
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  })
  function plant(x: number, z: number, cluster: boolean) {
    const size = 0.75 + random() * 0.6
    const materials = cluster ? woodlands : singleTrees
    const sprite = new THREE.Sprite(materials[Math.floor(random() * materials.length)]!)
    sprite.center.set(0.5, cluster ? 0.09 : 0)
    sprite.position.set(x, groundY - (cluster ? 0.4 : 0), z)
    sprite.scale.set((cluster ? 18 : 5.2) * size, (cluster ? 12 : 6) * size, 1)
    // Transparent foliage has no corresponding solid surface in the AO normal pass.
    sprite.userData.excludeFromAO = true
    trees.add(sprite)
    const shadowSize = (cluster ? 16 : 6) * size
    const shadow = plane(
      shadowSize,
      shadowSize * 0.65,
      x + 0.8,
      z + 0.5,
      groundY + 0.08 + random() * 0.01,
      shadowMaterial,
    )
    shadow.userData.excludeFromAO = true
  }
  // Stagger several depths of woodland instead of repeating isolated trees along a ruler.
  for (let row = 0; row < 5; row++) {
    for (let z = -86; z < 122; z += 9 + random() * 5) {
      plant(-35 - row * 8 - random() * 3, z + random() * 5, true)
      plant(48 + row * 8 + random() * 3, z + random() * 5, true)
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let x = -40; x < 51; x += 9 + random() * 4) {
      plant(x, 88 + row * 9 + random() * 4, true)
      // Keep the entrance corridor and the original access structure unobstructed.
      if (x < -15 || x > 23) plant(x, -57 - row * 10 - random() * 4, true)
    }
  }
  for (let z = -34; z < 76; z += 7 + random() * 5) {
    plant(-33 - random() * 2, z, false)
    plant(47 + random() * 2, z + random() * 3, false)
  }

  function setEnhanced(enabled: boolean) {
    if (disposed) return
    surfaceOverrides.forEach(({ mesh, original, enhanced, originalUV, enhancedUV }) => {
      mesh.material = enabled ? enhanced : original
      const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute
      uv.copyArray(enabled ? enhancedUV : originalUV)
      uv.needsUpdate = true
    })
    foliageMaterials.forEach((material, index) => {
      material.color.copy(foliageColors[index]!)
      // The source foliage is already lit. Only temper the green cast; OutputPass
      // supplies the same final exposure/tonemapping as the rest of the scene.
      if (enabled) material.color.lerp(new THREE.Color('#b5b7aa'), 0.12)
    })
    shadowMaterial.opacity = enabled ? 0.54 : 0.7
  }
  setEnhanced(true)

  return {
    group,
    setEnhanced,
    dispose() {
      disposed = true
      const geometries = new Set<THREE.BufferGeometry>()
      // Both variants remain allocated for comparison, including the hidden one.
      const materials = new Set<THREE.Material>([
        groundMaterial,
        roadMaterial,
        curbMaterial,
        enhancedGround,
        enhancedRoad,
        enhancedCurb,
      ])
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry)
          ;(Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
            materials.add(m),
          )
          if (object instanceof THREE.InstancedMesh) object.dispose()
        }
      })
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      foliageMaterials.forEach((material) => material.dispose())
      textures.forEach((t) => t.dispose())
      group.removeFromParent()
    },
  }
}
