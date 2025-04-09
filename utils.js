import os from 'node:os'
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import WasiPreview1 from 'easywasi'

// Get full path of a good place for a config file/dir
export function getConfigLoc(name = '', forceSet) {
  const homeDir = os.homedir()

  // this allows user to override dir, and optionally use ~ as "home"
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// get a string by pointer from the memory
function getString(instance, address, maxLen=1024) {
  let end = address;
  const memory = new Uint8Array(instance.memory.buffer);
  while (end < address + maxLen && memory[end] !== 0) {
    end++;
  }
  const bytes = memory.subarray(address, end);
  return decoder.decode(bytes);
}

// lower a string to wasm
function setString(instance, value) {
  const bytes = encoder.encode(value);
  const p = instance.malloc(bytes.length + 1);
  const memory = new Uint8Array(instance.memory.buffer);
  for (let i = 0; i < bytes.length; i++) {
    memory[p + i] = bytes[i];
  }
  memory[p + bytes.length] = 0;
  return p;
}

// this instantiates the wasm MCP and gets info from it (or returns the info you pass to it)
export async function getMcp(url, { allowHttp, allowFs, info = {}, bytes }, envOverride = {}) {
  const wasmBytes = new Uint8Array(bytes)
  const env =  {
    // TODO: add some HTTP stuff here and maybe JSON parsing stuff, obey allowHttp/allowFs
    ...envOverride
  }
  const wasi_snapshot_preview1 = new WasiPreview1()
  const i = await WebAssembly.instantiate(wasmBytes, { env, wasi_snapshot_preview1 })

  // easywasi currently has a bug where start() doesn't work
  wasi_snapshot_preview1.setup(i.instance.exports)
  i.instance.exports._initialize && i.instance.exports._initialize()
  i.instance.exports._start &&  i.instance.exports._start()

  // if there is an mcp export, use that to get info instead (for embedded JSON info)
  if (i.instance.exports.mcp) {
    info = JSON.parse(getString(i.instance.exports, i.instance.exports.mcp(), 1024))
  }
  return { ...i.instance.exports, info }
}


// return tool-handler function for a tool
export function wasmHandleTool(wasm, tool) {
  const { name, inputSchema, outputSchema = {type: 'string'} } = tool

  const func = wasm[tool.name]
  if (!func) {
    throw new Error(`${tool.name} not found in wasm.`)
  }

  const errorPointer = wasm.get_error_pointer()

  // this is the MCP handler function, args is an object
  return async (args = {}) => {
    const funcargs = []

    const pointersToFree = []

    // Process arguments according to inputSchema
    if (inputSchema && inputSchema.properties) {
      // Check for required fields
      if (inputSchema.required) {
        for (const requiredField of inputSchema.required) {
          if (args[requiredField] === undefined) {
            return {
              content: [{
                type: "text",
                text: `Error: Missing required field '${requiredField}'`
              }],
              isError: true
            };
          }
        }
      }

      // Process each property from inputSchema
      for (const [propName, propSchema] of Object.entries(inputSchema.properties)) {
        if (args[propName] !== undefined) {
          // Validate type and convert to appropriate WASM argument
          switch (propSchema.type) {
            case 'string':
              // For strings, we need to allocate memory in WASM and pass a pointer
              const strPtr = setString(wasm,args[propName]);
              pointersToFree.push(strPtr)
              funcargs.push(strPtr);
              break;
            case 'number':
            case 'integer':
              if (typeof args[propName] !== 'number') {
                try {
                  // Try to convert string to number if possible
                  const num = Number(args[propName]);
                  if (isNaN(num)) throw new Error();
                  funcargs.push(num);
                } catch {
                  return {
                    content: [{
                      type: "text",
                      text: `Error: Field '${propName}' must be a number`
                    }],
                    isError: true
                  };
                }
              } else {
                funcargs.push(args[propName]);
              }
              break;
            case 'boolean':
              funcargs.push(Boolean(args[propName]) ? 1 : 0);
              break;
            case 'object':
            case 'array':
              // For complex types, serialize to JSON and pass as string
              const jsonStr = JSON.stringify(args[propName]);
              const jsonPtr = setString(wasm,jsonStr);
              pointersToFree.push(strPtr)
              funcargs.push(jsonPtr);
              break;
            default:
              return {
                content: [{
                  type: "text",
                  text: `Error: Unsupported type '${propSchema.type}' for field '${propName}'`
                }],
                isError: true
              };
          }
        } else if (inputSchema.required && inputSchema.required.includes(propName)) {
          // This should be caught earlier, but adding as an extra check
          return {
            content: [{
              type: "text",
              text: `Error: Missing required field '${propName}'`
            }],
            isError: true
          };
        }
      }

      // Check for unexpected arguments
      for (const argName of Object.keys(args)) {
        if (!inputSchema.properties[argName]) {
          // Optional: either ignore or return error for unexpected arguments
          console.warn(`Unexpected argument '${argName}' passed to ${tool.name}`);
        }
      }
    }

    funcargs.push(errorPointer);

    // reset error pointer to 0
    wasm.memory.setInt32(errorPointer, 0);

    // call wasm function
    const output = func(...funcargs);

    // call free() on all funcargs that are allocated pointers (strings)
    for (const p of pointersToFree) {
      wasm.free(p)
    }

    if (wasm.memory.getInt32(errorPointer) !== 0) {
      const msg = output === 0 ? `${tool.name} call failed` : getString(wasm, output, 1024);
      return {
        content: [{
          type: "text",
          text: `Error: ${msg}`
        }],
        isError: true
      };
    }

    if (outputSchema?.type === 'number') {
      return {
        content: [{
          type: "text",
          text: output.toString()
        }]
      };
    }

    // this will handle JSON and string
    return {
      content: [{
        type: "text",
        text: getString(wasm, output)
      }]
    };
  };
}
