import { wrapPromise, callPromise } from '@easywasm/promises'
import MemoryView from '@easywasm/memory'
import WasiPreview1 from '@easywasm/wasi'

export async function wasmLoader(wasmBytes, imports = {}) {
  const env = {
    http_get: wrapPromise(
      () => mod,
      async (urlPtr) => {
        const b = new Uint8Array( await fetch(view.getString(urlPtr)).then(r =>r.arrayBuffer()))
        const p = mod.malloc(b.length + 1)
        view.setUint8(p + b.length, 0)
        view.setBytes(b, p)
        return p
      }
    )
  }
  const wasi_snapshot_preview1 = new WasiPreview1()
  const mod = (await WebAssembly.instantiate(wasmBytes, { env, wasi_snapshot_preview1, ...imports })).instance.exports
  const view = new MemoryView(mod.memory, mod.malloc)
  mod.init_callback_system && mod.init_callback_system()
  wasi_snapshot_preview1.start(mod)
  return { ...mod, view }
}

export async function callMcp(mod, name, i = {}) {
  mod.mcp_set_input(mod.view.setString(JSON.stringify(i)))
  mod.mcp_set_output(0)
  const e = await callPromise(mod, mod[name])
  if (e !== 0) {
    throw new Error(mod.view.getString(mod.mcp_get_error()))
  }
  const r = mod.mcp_get_output()
  if (mod.view.getUint8(r) === 0) {
    throw new Error(mod.view.getString(mod.mcp_get_error()))
  }
  const s = mod.view.getString(r)
  mod.free(r)
  return s
}
