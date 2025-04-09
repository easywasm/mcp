// shared header for C-based WASM MCPs

#define WASM_EXPORT(name) __attribute__((export_name(#name)))
#define WASM_IMPORT(name) __attribute__((import_module("env"))) __attribute__((import_name(#name)))

// this is a single universal pointer to check if there are errors
int global_error_pointer = 0;
WASM_EXPORT(get_error_pointer) int* get_error_pointer() {
  return &global_error_pointer;
}
