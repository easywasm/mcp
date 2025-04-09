// example WASM MCP that can look up weather

// build: /opt/wasi-sdk/bin/clang -nostdlib -Wl,--no-entry examples/weather.c -o examples/weather.wasm

#include "inc/mcp.h"

// you could make something like this that returns JSON
// but I think it's nicer to make a JSON file alongside it
// WASM_EXPORT(mcp) char* mcp() {}

// These are the MCP tool callbacks

// They can return these things (depending on how it's setup in weather.json)
//   - an integer (for number output)
//   - a plain string pointer (for string output)
//   - a JSON string pointer (for object output)
//   - for an error, set errorPointer to non-0 and return string-pointer for message

WASM_EXPORT(get_alerts) char* get_alerts(char* state, int* errorPointer) {
  *errorPointer = 1;
  return "Not implemented";
}

WASM_EXPORT(get_forecast) char* get_forecast(int latitude, int longitude, int* errorPointer) {
  *errorPointer = 1;
  return "Not implemented";
}
