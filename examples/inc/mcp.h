// shared header for C-based WASM MCPs

#include <stdlib.h>

#define WASM_EXPORT(name) __attribute__((export_name(#name)))
#define WASM_IMPORT(name) __attribute__((import_module("env"))) __attribute__((import_name(#name)))

// this is a single universal pointer to check if there are errors
int _mcp_error_pointer = 0;
WASM_EXPORT(get_error_pointer) int* _mcp_get_error_pointer() {
  return &_mcp_error_pointer;
}

WASM_EXPORT(malloc) void* _mcp_malloc(size_t size) {
  return malloc(size);
}

WASM_EXPORT(free) void _mcp_free(void *ptr) {
  free(ptr);
}
