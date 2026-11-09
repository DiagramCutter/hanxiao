import * as THREE from 'three'

type SurfaceProfile = {
  roughness: number
  specular: number
  /** Keep the original atlas; these are small procedural variations over it. */
  detail?: { grain: number; relief: number; roughness: number }
}

// These original surface names and atlases are retained in hcangdi2-compressed.glb.
// The colour maps were inspected before assigning profiles. #1128 and #1123 are
// mixed atlases: neither should receive a replacement UV map or a metallic coat.
const profiles: Record<string, SurfaceProfile> = {
  'Material #1128': {
    roughness: 0.9,
    specular: 0.7,
    detail: { grain: 0.075, relief: 0.022, roughness: 0.13 },
  },
  'Material #1123': {
    roughness: 0.84,
    specular: 0.65,
    detail: { grain: 0.035, relief: 0.012, roughness: 0.08 },
  },
  '05 - Default': {
    roughness: 0.91,
    specular: 0.65,
    detail: { grain: 0.055, relief: 0.018, roughness: 0.11 },
  },
  'Material #1125': {
    roughness: 0.9,
    specular: 0.65,
    detail: { grain: 0.04, relief: 0.014, roughness: 0.1 },
  },
  'Material #1126': {
    roughness: 0.9,
    specular: 0.65,
    detail: { grain: 0.04, relief: 0.014, roughness: 0.1 },
  },
  // Painted fencing, machinery and cabins are dielectric surfaces, even when
  // their underlying geometry is metal. Metalness is deliberately not raised.
  'Material #1131': { roughness: 0.72, specular: 0.8 },
  'Material #390': { roughness: 0.72, specular: 0.8 },
  'Material #1122': { roughness: 0.72, specular: 0.8 },
  'Material #1209': { roughness: 0.64, specular: 0.8 },
  'Material #1210': { roughness: 0.64, specular: 0.8 },
  'Material #1211': { roughness: 0.64, specular: 0.8 },
  Material_8014: { roughness: 0.62, specular: 0.85 },
  XIAOFANGZI: { roughness: 0.7, specular: 0.85 },
  JIQI: { roughness: 0.66, specular: 0.85 },
  'Material #922': { roughness: 0.94, specular: 0.45 },
}

const detailFunctions = /* glsl */ `
varying vec3 vSiteSurfacePosition;

float siteHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float siteNoise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(siteHash(cell), siteHash(cell + vec3(1, 0, 0)), f.x),
        mix(siteHash(cell + vec3(0, 1, 0)), siteHash(cell + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(siteHash(cell + vec3(0, 0, 1)), siteHash(cell + vec3(1, 0, 1)), f.x),
        mix(siteHash(cell + vec3(0, 1, 1)), siteHash(cell + vec3(1, 1, 1)), f.x), f.y), f.z);
}

vec3 siteSurfaceNormal(vec3 surfacePosition, vec3 surfaceNormal, float height, float direction) {
  vec3 sigmaX = dFdx(surfacePosition);
  vec3 sigmaY = dFdy(surfacePosition);
  vec3 r1 = cross(sigmaY, surfaceNormal);
  vec3 r2 = cross(surfaceNormal, sigmaX);
  float determinant = dot(sigmaX, r1) * direction;
  vec3 gradient = sign(determinant) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(max(abs(determinant), 0.000001) * surfaceNormal - gradient);
}
`

type MaterialState = {
  material: THREE.MeshStandardMaterial
  roughness: number
  envMapIntensity: number
  specularIntensity?: number
  specularColor?: THREE.Color
  onBeforeCompile: THREE.Material['onBeforeCompile']
  customProgramCacheKey: THREE.Material['customProgramCacheKey']
  programKey: string
  profile?: SurfaceProfile
}

/**
 * Reversible rendering-only enhancement. No GLB geometry, UVs, colour maps or
 * business state are changed. The caller still owns all original resources.
 * Dispose this helper before disposing the model so texture sampler settings
 * and shader hooks are restored. No auxiliary GPU textures are allocated.
 */
export function enhanceSiteMaterials(root: THREE.Object3D, renderer: THREE.WebGLRenderer) {
  const states: MaterialState[] = []
  const materials = new Set<THREE.MeshStandardMaterial>()
  const textureAnisotropy = new Map<THREE.Texture, number>()
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  let enabled = false
  let disposed = false

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const items = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of items) {
      if (!(material instanceof THREE.MeshStandardMaterial) || materials.has(material)) continue
      materials.add(material)
      const physical = material instanceof THREE.MeshPhysicalMaterial ? material : undefined
      states.push({
        material,
        roughness: material.roughness,
        envMapIntensity: material.envMapIntensity,
        specularIntensity: physical?.specularIntensity,
        specularColor: physical?.specularColor.clone(),
        onBeforeCompile: material.onBeforeCompile,
        customProgramCacheKey: material.customProgramCacheKey,
        programKey: material.customProgramCacheKey(),
        profile: profiles[material.name],
      })
      if (material.map && !textureAnisotropy.has(material.map)) {
        textureAnisotropy.set(material.map, material.map.anisotropy)
      }
    }
  })

  function setEnabled(value: boolean) {
    if (disposed || value === enabled) return
    enabled = value
    textureAnisotropy.forEach((original, texture) => {
      texture.anisotropy = value ? Math.max(original, maxAnisotropy) : original
      texture.needsUpdate = true
    })

    states.forEach((state) => {
      const { material, profile } = state
      material.roughness = value && profile ? profile.roughness : state.roughness
      material.envMapIntensity = value ? 0.65 : state.envMapIntensity
      material.onBeforeCompile = state.onBeforeCompile
      material.customProgramCacheKey = state.customProgramCacheKey
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.specularIntensity = value ? (profile?.specular ?? 0.55) : state.specularIntensity!
        material.specularColor.copy(state.specularColor!)
        if (value) {
          material.specularColor.r = THREE.MathUtils.clamp(material.specularColor.r, 0, 1)
          material.specularColor.g = THREE.MathUtils.clamp(material.specularColor.g, 0, 1)
          material.specularColor.b = THREE.MathUtils.clamp(material.specularColor.b, 0, 1)
        }
      }
      if (value && profile?.detail) {
        const detail = profile.detail
        material.onBeforeCompile = function (shader, webglRenderer) {
          state.onBeforeCompile.call(this, shader, webglRenderer)
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSiteSurfacePosition;')
            .replace(
              '#include <worldpos_vertex>',
              '#include <worldpos_vertex>\nvSiteSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
            )
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\n' + detailFunctions)
            .replace(
              '#include <map_fragment>',
              /* glsl */ `#include <map_fragment>
              // Fade grain below a pixel to avoid sparkling on the distant yard.
              float siteFootprint = length(fwidth(vSiteSurfacePosition));
              float siteFineFade = 1.0 - smoothstep(0.15, 0.8, siteFootprint);
              float siteCoarse = siteNoise(vSiteSurfacePosition * 0.19);
              float siteFine = siteNoise(vSiteSurfacePosition * 2.4);
              float siteGrain = (siteCoarse - 0.5) + (siteFine - 0.5) * siteFineFade * 0.35;
              // Preserve bright painted markings and the existing atlas colour.
              float siteWhite = smoothstep(0.66, 0.92, min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)));
              diffuseColor.rgb *= 1.0 + siteGrain * ${detail.grain.toFixed(4)} * (1.0 - siteWhite * 0.8);
              `,
            )
            .replace(
              '#include <roughnessmap_fragment>',
              `#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + siteGrain * ${detail.roughness.toFixed(4)}, 0.55, 1.0);`,
            )
            .replace(
              '#include <normal_fragment_maps>',
              /* glsl */ `#include <normal_fragment_maps>
              float siteHeight = (siteCoarse + siteFine * siteFineFade * 0.25) * ${detail.relief.toFixed(4)};
              normal = siteSurfaceNormal(-vViewPosition, normal, siteHeight, faceDirection);
              `,
            )
        }
        material.customProgramCacheKey = () =>
          `${state.programKey}|site-surface-v1:${detail.grain}:${detail.relief}:${detail.roughness}`
      }
      material.needsUpdate = true
    })
  }

  setEnabled(true)
  return {
    setEnabled,
    dispose() {
      if (disposed) return
      setEnabled(false)
      disposed = true
      states.length = 0
      materials.clear()
      textureAnisotropy.clear()
    },
  }
}
