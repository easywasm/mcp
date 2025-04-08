import os from 'node:os'
import path from 'node:path'
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
export async function getBytes(url, string) {
  if (url.protocol === 'file:') {
    if (string) {
      return readFile(url.pathname, 'utf8')
    } else {
      return readFile(url.pathname)
    }
  } else {
    if (string) {
      return fetch(url).then((r) => r.text())
    } else {
      return fetch(url).then((r) => r.arrayBuffer())
    }
  }
}

// get a string by pointer from the memory
export function getString(instance, address, maxLen=1024) {
  let len = 0
  let str = ''
  while (len < maxLen) {
    const char = instance.memory.getUint8(address + len)
    if (char === 0) break
    str += String.fromCharCode(char)
    len++
  }
  return str
}

export async function getMcp({ url, info = {}, bytes }, envOverride = {}) {
  const wasmBytes = new Uint8Array(bytes)
  const env =  {
    ...envOverride
  }
  const wasi_snapshot_preview1 = new WasiPreview1()
  const i = await WebAssembly.instantiate(wasmBytes, { env, wasi_snapshot_preview1 })

  // easywasi currently has a bug where setup() doesn't work
  wasi_snapshot_preview1.setup({ memory: i.instance.exports.memory })
  let retval = -1

  if (i.instance.exports._initialize) {
    i.instance.exports._initialize()
  }
  if (i.instance.exports._start) {
    i.instance.exports._start()
  }

  // if there is an mcp export, use that to get info instead (for embedded JSON info)
  if (i.instance.exports.mcp) {
    info = JSON.parse(getString(i.instance.exports, i.instance.exports.mcp(), 1024))
  }
  return { ...i.instance.exports, info }
}
