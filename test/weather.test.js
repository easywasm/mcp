import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { wasmLoader, callMcp } from '../src/wasm.js'

const bytes = await readFile('examples/weather.wasm')

test('basic load', async ({ assert }) => {
  const wasm = await wasmLoader(bytes)
  const i = Object.keys(wasm)
  assert.deepEqual(i, [
      'memory',
      '_initialize',
      'init_callback_system',
      'wasm_promise_callbacks_register',
      'resolve_promise',
      'malloc',
      'free',
      'mcp_get_error',
      'mcp_get_output',
      'mcp_set_output',
      'mcp_set_input',
      'get_alerts',
      'get_forecast',
      'view'
    ])
})

test('calls get_alerts->http_get', async ({ assert }) => {
  const wasm = await wasmLoader(bytes)
  const r = await callMcp(wasm, 'get_alerts', { state: 'OR' })
  // console.log(r)
})

test('calls get_forecast->http_get', async ({ assert }) => {
  const wasm = await wasmLoader(bytes)
  const r = await callMcp(wasm, 'get_forecast', { latitude: 45.512230, longitude: -122.658722 })
  // console.log(r)
})
