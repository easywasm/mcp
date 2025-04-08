This is an MCP runtime for LLMs that uses wasm MCP servers.

The idea is that you write your MCP in ay language and compile it, and you can use it to add tools to Claude or whatever. The purpose is cross-platform & fast sandboxed MCPs that are easy to use, that can be written in any language.

### usage

Essentially, you need to add some config to your AI program. It must link to a file or URL (which will be cached.) You can get this config by pointing it to a wasm:


```
npx -y wasm-mcp config https://github.com/konsumer/wasm-mcp/raw/refs/heads/main/examples/weather.wasm
```

### make your own

You can make your own MCP by exposing a few functions. See [examples](examples)