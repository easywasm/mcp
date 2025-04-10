// example WASM MCP that can look up weather

// build: /opt/wasi-sdk/bin/clang -mexec-model=reactor -I node_modules/@easywasm/promises -I header/c examples/weather.c examples/parson.c -o examples/weather.wasm

#include <stdio.h>
#include <string.h>

#include "mcp.h"
#include "parson.h"

void get_alerts_callback(void* a) {
    char* alertJSONString = (char*)a;

    // TODO: parse JSON and extract relevant information
    // TODO: output the alerts to the MCP output
    char buffer[1024*1024] = {};
    sprintf(buffer, "Alerts retrieved: %lu: %s", strlen(alertJSONString), alertJSONString);
    mcp_set_output(buffer);
}

void get_forecast_callback(void* a) {
    char* forecastJSONString = (char*)a;

    // TODO: parse JSON and extract relevant information
    // TODO: output the forecast to the MCP output
    char buffer[1024*10] = {};
    sprintf(buffer, "Forecast retrieved: %lu: %s", strlen(forecastJSONString), forecastJSONString);
    mcp_set_output(buffer);
}

WASM_EXPORT(get_alerts) int get_alerts() {
    JSON_Value* input = json_parse_string(mcp_get_input());
    const char* state = json_object_get_string(json_object(input), "state");
    json_value_free(input);
    char url[60] = {};
    sprintf(url, "https://api.weather.gov/alerts/active?area=%s", state);
    wasm_promise_callbacks_register(http_get(url), get_alerts_callback);
    return 0;
}

WASM_EXPORT(get_forecast) int get_forecast() {
    JSON_Value* input = json_parse_string(mcp_get_input());
    const double latitude = json_object_get_number(json_object(input), "latitude");
    const double longitude = json_object_get_number(json_object(input), "longitude");
    json_value_free(input);
    char url[60] = {};
    sprintf(url, "https://api.weather.gov/points/%f,%f", latitude, longitude);
    wasm_promise_callbacks_register(http_get(url), get_forecast_callback);
    return 0;
}
