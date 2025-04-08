// example WASM MCP that can look up weather

// build: /opt/wasi-sdk/bin/clang -nostdlib -Wl,--no-entry examples/weather.c -o examples/weather.wasm

#include "inc/mcp.h"

// you could make something like this that returns JSON
// but I think it's nicer to make a JSON file alongside it
// WASM_EXPORT(mcp) char* mcp() {}


WASM_EXPORT(get_alerts) char* get_alerts(char* state) {
  return "{}";
}

WASM_EXPORT(get_forecast) char* get_forecast(int latitude, int longitude) {
  return "{}";
}
