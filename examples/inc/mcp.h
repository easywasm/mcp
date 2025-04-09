// shared header for C-based WASM MCPs

#include <stdlib.h>
#include <string.h>

#define WASM_EXPORT(name) __attribute__((export_name(#name)))
#define WASM_IMPORT(name) __attribute__((import_module("env"))) __attribute__((import_name(#name)))

// these allow host to manage memory

WASM_EXPORT(malloc) void* _mcp_malloc(size_t size) {
  return malloc(size);
}

WASM_EXPORT(free) void _mcp_free(void *ptr) {
  free(ptr);
}

// Global buffer for error messages
static char  _mcp_error_buffer[256] = {0};

// Returns 0 when successful, or pointer to error message when failed
int mcp_set_error(const char* message) {
  if (message == NULL) {
    _mcp_error_buffer[0] = '\0';  // Clear error
    return 0;
  }
  strncpy(_mcp_error_buffer, message, sizeof( _mcp_error_buffer) - 1);
  _mcp_error_buffer[sizeof( _mcp_error_buffer) - 1] = '\0';
  return (int) _mcp_error_buffer;
}
