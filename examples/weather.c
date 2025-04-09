// example WASM MCP that can look up weather

// build: /opt/wasi-sdk/bin/clang -nostdlib -Wl,--no-entry examples/weather.c -o examples/weather.wasm

#include "inc/mcp.h"

// you could make something like this that returns JSON
// but I think it's nicer to make a JSON file alongside it
// WASM_EXPORT(mcp) char* mcp() {}

// These are the MCP tool callbacks
// they return status (0=ok, non-0=pointer-to-error-message)

WASM_EXPORT(get_alerts) int get_alerts(char* state, char* output, int* outputLen) {
  return mcp_set_error("Not implemented");
}

WASM_EXPORT(get_forecast) int get_forecast(int latitude, int longitude, char* output, int* outputLen) {
  return mcp_set_error("Not implemented");
}
