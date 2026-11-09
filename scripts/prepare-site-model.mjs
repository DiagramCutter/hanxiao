import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Prepare the hcangdi2 export before WebP / Draco compression. The original
// artist file stays unchanged; node transforms and all geometry are preserved.
const [input, output] = process.argv.slice(2)
if (!input || !output || resolve(input) === resolve(output)) {
  throw new Error('Usage: node scripts/prepare-site-model.mjs input.glb separate-output.glb')
}
const source = readFileSync(input)
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) {
  throw new Error('Expected a glTF 2.0 binary file')
}
const jsonLength = source.readUInt32LE(12)
const document = JSON.parse(source.toString('utf8', 20, 20 + jsonLength))
if (!document.nodes.some((node) => node.name === '231')) {
  throw new Error('Missing original compound datum 231')
}

for (const material of document.materials) {
  // This export omitted metallicFactor, whose glTF default is 1. All site
  // surfaces are painted metal, concrete or vegetation, matching the old site.
  material.pbrMetallicRoughness ??= {}
  material.pbrMetallicRoughness.metallicFactor = 0
  const specular = material.extensions?.KHR_materials_specular
  if (specular?.specularColorFactor) {
    specular.specularColorFactor = specular.specularColorFactor.map((v) =>
      Math.min(1, Math.max(0, v)),
    )
  }
}

// These embedded white/yellow images were checked pixel by pixel: each is a
// single solid sRGB colour. Use linear baseColorFactor only on missing-UV draws.
const solidColours = {
  'Material #1208': [255, 255, 255],
  'Material #1209': [241, 218, 26],
  'Material #1129': [255, 255, 255],
}
const linear = (byte) => {
  const srgb = byte / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}
const replacements = new Map()
let repaired = 0
for (const mesh of document.meshes) {
  for (const primitive of mesh.primitives) {
    const material = document.materials[primitive.material]
    if (
      primitive.attributes.TEXCOORD_0 !== undefined ||
      !material?.pbrMetallicRoughness?.baseColorTexture
    )
      continue
    const colour = solidColours[material.name]
    if (!colour) throw new Error(`Unrecognised missing-UV surface: ${material.name}`)
    if (!replacements.has(primitive.material)) {
      const clone = structuredClone(material)
      clone.name += ' (solid markings)'
      const factor = clone.pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1]
      clone.pbrMetallicRoughness.baseColorFactor = [
        ...colour.map((byte, i) => linear(byte) * factor[i]),
        factor[3],
      ]
      delete clone.pbrMetallicRoughness.baseColorTexture
      replacements.set(primitive.material, document.materials.length)
      document.materials.push(clone)
    }
    primitive.material = replacements.get(primitive.material)
    repaired++
  }
}

const json = Buffer.from(JSON.stringify(document))
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20)
json.copy(padded)
const tail = source.subarray(20 + jsonLength)
const header = Buffer.alloc(20)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(20 + padded.length + tail.length, 8)
header.writeUInt32LE(padded.length, 12)
header.writeUInt32LE(0x4e4f534a, 16)
writeFileSync(output, Buffer.concat([header, padded, tail]))
console.log(
  `Prepared ${document.materials.length} materials; repaired ${repaired} missing-UV solid markings.`,
)
