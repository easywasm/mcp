import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import WasiPreview1 from 'easywasi'

// Get full path of a good place for a config file/dir
export function getConfigLoc(name = '', forceSet) {
  const homeDir = os.homedir()

  if (forceSet) {
    return forceSet.replace(new RegExp('^~', 'g'), homeDir)
  }

  let configDir

  switch (process.platform) {
    case 'win32':
      configDir = path.join(homeDir, 'AppData', 'Roaming', name)
      break
    case 'darwin':
      configDir = path.join(homeDir, 'Library', 'Application Support', name)
      break
    case 'linux':
      configDir = path.join(homeDir, '.config', name)
      break
    default:
      configDir = path.join(homeDir, `.${name}`) // Fallback for other platforms
      break
  }
  return configDir
}

// Get the contents of a file/URL
export async function getBytes(wasmName, string) {
  let u
  try {
    u = new URL(wasmName)
  } catch (e) {
    u = url.pathToFileURL(wasmName)
  }

  if (u.protocol === 'file:') {
    if (string) {
      return readFile(u.pathname, 'utf8')
    } else {
      return readFile(u.pathname)
    }
  } else {
    if (string) {
      return fetch(u).then((r) => r.text())
    } else {
      return fetch(u).then((r) => r.arrayBuffer())
    }
  }
}

export function getString(instance, address, maxLen) {}

// This will return an instance of the wasm, all ready to go
export async function getMcp(wasmName, info = {}, envOverride = {}) {
  const bytes = await getBytes(wasmName)
  const env = {
    ...envOverride
  }
  const wasi_snapshot_preview1 = new WasiPreview1()
  const i = await WebAssembly.instantiate(bytes, { env, wasi_snapshot_preview1 })

  // easywasi currently has a bug where setup() doesn't work
  wasi_snapshot_preview1.setup({ memory: i.instance.exports.memory })
  let retval = -1

  if (i.instance.exports._initialize) {
    i.instance.exports._initialize()
  }
  if (i.instance.exports._start) {
    i.instance.exports._start()
  }

  if (i.instance.exports.mcp) {
    info = JSON.parse(getString(i.instance.exports, i.instance.exports.mcp(), 1024))
  }

  return { ...i.instance.exports, info, bytes }
}
