import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

const DRACO_DECODER_PATH = '/draco/'

let dracoLoader: DRACOLoader | null = null

const getDracoLoader = () => {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
  }

  return dracoLoader
}

export const createGLTFLoader = () => {
  const loader = new GLTFLoader()
  loader.setDRACOLoader(getDracoLoader())

  return loader
}
