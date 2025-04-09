#!/usr/bin/env node

import url from 'node:url'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { mkdirp } from 'mkdirp'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { z } from 'zod'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { getConfigLoc, getMcp, getBytes, wasmHandleTool } from './utils.js'

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
    (y) => {
      y.option('no-cache', {
        alias: 'n',
        type: 'boolean',
        description: "Don't use the cache"
      })
      y.option('allow-http', {
        alias: 'n',
        type: 'boolean',
        description: "Allow MCP to make HTTP calls"
      })
      y.option('allow-fs', {
        alias: 'n',
        type: 'boolean',
        description: "Allow MCP to have full filesystem access (rather than just it's own scratch-space)"
      })
    },
    async ({ WASM_LOCATION, noCache, allowHttp, allowFs }) => {
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

      const wasm = await getMcp(u.toString(), { ...cache[u.toString()], allowHttp, allowFs})
      const { memory, info: { name, version, tools=[] }, malloc, free, ...callbacks } = wasm
      const server = new McpServer({ name, version })

      const errorPointer = wasm.get_error_pointer();

      // TODO: also handle resources (see https://github.com/modelcontextprotocol/typescript-sdk)

      for (const tool of tools) {
        server.tool(tool.name, tool.inputSchema, wasmHandleTool(wasm, tool))
      }
      console.error(`${wasm.info.name} ${wasm.info.version} MCP Server running on stdio`);
      const transport = new StdioServerTransport()
      await server.connect(transport)
    }
  ).argv
