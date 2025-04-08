#!/usr/bin/env node

import url from 'node:url'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { mkdirp } from 'mkdirp'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

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

// this will setup the MCP server using '@modelcontextprotocol/sdk
async function setupServer({ info, memory, ...callbacks}) {
  const { tools, ...descriptor} = info
  const server = new Server(
    descriptor,
    {
      capabilities: {
        tools: {},
      },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const f = callbacks[name]
    if (!f) throw new Error(`No callback for ${name}`)
    // TODO: actually call the function
    // see https://github.com/hideya/mcp-server-weather-js/blob/main/src/index.ts
  })


  return server
}


const argv = yargs(hideBin(process.argv))
  .help()
  .version()
  .command(
    ['run <WASM_LOCATION>', '$0 <WASM_LOCATION>'],
    'Run a WASM MCP',
    (y) => {
      y.option('no-cache', {
        alias: 'n',
        type: 'boolean',
        description: "Don't use the cache"
      })
    },
    async ({ WASM_LOCATION, noCache }) => {
      let u
      try {
        u = new URL(WASM_LOCATION)
      } catch (e) {
        u = url.pathToFileURL(WASM_LOCATION)
      }

      if (noCache) {
        cache[u.toString()] = undefined
      }

      if (!cache[u.toString()]) {
        // TODO: make this configurable
        const jsonUrl = new URL(path.basename(u.pathname, '.wasm') + '.json', u)
        cache[u.toString()] = {
          bytes: [...new Uint8Array(await getBytes(u))],
          info: JSON.parse(await getBytes(jsonUrl, true))
        }
        if (!noCache) {
          await writeFile(DIR_WASM_MCP_CONFIG_FILE, JSON.stringify({ cache, settings }, null, 2))
        }
      }

      const wasm = await getMcp(cache[u.toString()])
      const server = await setupServer(wasm)
      const transport = new StdioServerTransport()
      await server.connect(transport)
      console.error(`${wasm.info.name} ${wasm.info.version} MCP Server running on stdio`);
    }
  ).argv
