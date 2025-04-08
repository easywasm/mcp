#!/usr/bin/env node

import path from 'node:path'
import { mkdirp } from 'mkdirp'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getConfigLoc, getMcp, getBytes } from './utils.js'

// this allows user to override with a value like `~/.config/whatever.json`
const DIR_WASM_MCP_CONFIG_FILE = getConfigLoc('wasm-mcp/settings.json', process.env.DIR_WASM_MCP_CONFIG_FILE)
const configdir = path.dirname(DIR_WASM_MCP_CONFIG_FILE)
await mkdirp(configdir)

let cache = {}
let settings = {}

try {
  const r = JSON.parse(await readFile(DIR_WASM_MCP_CONFIG_FILE))
  cache = r.cache
  settings = r.settings
} catch (e) {}

settings.cacheLocation ||= path.join(configdir, 'cache')
await mkdirp(settings.cacheLocation)

const argv = yargs(hideBin(process.argv))
  .help()
  .version()
  .command(
    ['run <WASM_LOCATION>', '$0 <WASM_LOCATION>'],
    'Run a WASM MCP',
    (y) => {},
    async ({ WASM_LOCATION }) => {
      // TODO: make this an option
      let info = {}
      try {
        info = JSON.parse(await getBytes(WASM_LOCATION.replace(/\.wasm$/, '.json', true)))
      } catch (e) {}
      const wasm = await getMcp(WASM_LOCATION, info)

      console.log(wasm)
    }
  ).argv
