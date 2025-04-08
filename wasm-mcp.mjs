#!/usr/bin/env node

import url from 'node:url'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { mkdirp } from 'mkdirp'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getConfigLoc, getMcp, getBytes } from './utils.js'

// this allows user to override with a value like `~/.config/whatever.json`
const DIR_WASM_MCP_CONFIG_FILE = getConfigLoc('wasm-mcp.json', process.env.DIR_WASM_MCP_CONFIG_FILE)
await mkdirp(path.dirname(DIR_WASM_MCP_CONFIG_FILE))

let cache = {}
let settings = {}

try {
  const r = JSON.parse(await readFile(DIR_WASM_MCP_CONFIG_FILE))
  cache = r.cache
  settings = r.settings
} catch (e) {}

const argv = yargs(hideBin(process.argv))
  .help()
  .version()
  .command(
    ['run <WASM_LOCATION>', '$0 <WASM_LOCATION>'],
    'Run a WASM MCP',
    (y) => {},
    async ({ WASM_LOCATION }) => {
      let u
      try {
        u = new URL(WASM_LOCATION)
      } catch (e) {
        u = url.pathToFileURL(WASM_LOCATION)
      }

      if (!cache[u.toString()]) {
        // TODO: make this configurable
        const jsonUrl = new URL(path.basename(u.pathname, '.wasm') + '.json', u)
        cache[u.toString()] = {
          bytes: [...new Uint8Array(await getBytes(u))],
          info: JSON.parse(await getBytes(jsonUrl, true))
        }
        await writeFile(DIR_WASM_MCP_CONFIG_FILE, JSON.stringify({ cache, settings }, null, 2))
      }
      const wasm = await getMcp(cache[u.toString()])
      console.log(wasm)
    }
  ).argv
