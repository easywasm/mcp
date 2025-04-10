// shared header for C-based WASM MCPs

#include <stdlib.h>
#include <string.h>

// this comes from node_modules/@easywasm/promises
#include "callback_system.h"

// these allow host to manage memory

WASM_EXPORT(malloc) void* _mcp_malloc(size_t size) {
  return malloc(size);
}

WASM_EXPORT(free) void _mcp_free(void *ptr) {
  free(ptr);
}

WASM_IMPORT(http_get) int http_get(const char* url);

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

WASM_EXPORT(mcp_get_error) char* mcp_get_error() {
    return _mcp_error_buffer;
}

static char  _mcp_output_buffer[1024*10] = {0};

WASM_EXPORT(mcp_get_output) char* mcp_get_output() {
    return _mcp_output_buffer;
}

WASM_EXPORT(mcp_set_output) void mcp_set_output(const char* message) {
  if (message == NULL) {
    _mcp_output_buffer[0] = '\0';
  }
  strncpy(_mcp_output_buffer, message, sizeof( _mcp_output_buffer) - 1);
  _mcp_output_buffer[sizeof( _mcp_output_buffer) - 1] = '\0';
}

static char  _mcp_input_buffer[1024 * 1024] = {0};

char* mcp_get_input() {
    return _mcp_input_buffer;
}

WASM_EXPORT(mcp_set_input) void mcp_set_input(const char* message) {
  if (message == NULL) {
    _mcp_input_buffer[0] = '\0';
  }
  strncpy(_mcp_input_buffer, message, sizeof(_mcp_input_buffer) - 1);
  _mcp_input_buffer[sizeof(_mcp_input_buffer) - 1] = '\0';
}
