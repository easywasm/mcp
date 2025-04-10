// example WASM MCP that can look up weather

// build: /opt/wasi-sdk/bin/clang -mexec-model=reactor -I node_modules/@easywasm/promises -I header/c examples/weather.c examples/parson.c -o examples/weather.wasm

#include <stdio.h>
#include <string.h>
#include <stdbool.h>

#include "mcp.h"
#include "parson.h"

// Use fixed buffer size for message
#define MAX_MESSAGE_SIZE 8192

char* build_forecast_message(const char* json_str) {
    // Initialize an empty message buffer
    static char message_buffer[MAX_MESSAGE_SIZE] = "";
    message_buffer[0] = '\0';  // Ensure it's empty

    // Parse the JSON string
    JSON_Value* root_value = json_parse_string(json_str);
    if (root_value == NULL) {
        strcpy(message_buffer, "Error: Unable to parse JSON data");
        return message_buffer;
    }

    // Get the periods array
    JSON_Array* periods = json_value_get_array(root_value);
    if (periods == NULL) {
        strcpy(message_buffer, "Error: Unable to find forecast periods");
        json_value_free(root_value);
        return message_buffer;
    }

    size_t period_count = json_array_get_count(periods);

    // Process each forecast period
    for (size_t i = 0; i < period_count; i++) {
        JSON_Object* period = json_array_get_object(periods, i);

        // Extract the required fields from each period
        const char* name = json_object_get_string(period, "name");
        const char* detailed_forecast = json_object_get_string(period, "detailedForecast");

        // Check if we have valid data
        if (name && detailed_forecast) {
            // Format and append this period's forecast to the message buffer
            char period_forecast[1024];
            snprintf(period_forecast, sizeof(period_forecast),
                     "Forecast for %s: %s\n\n",
                     name, detailed_forecast);

            // Append to main buffer if there's enough space
            if (strlen(message_buffer) + strlen(period_forecast) < MAX_MESSAGE_SIZE) {
                strcat(message_buffer, period_forecast);
            } else {
                // Not enough space left, truncate and indicate this
                strcat(message_buffer, "...(truncated due to buffer size)");
                break;
            }
        }
    }

    // Clean up
    json_value_free(root_value);

    return message_buffer;
}

char* build_alert_message(const char* json_str, const char* state_code) {
    static char message_buffer[MAX_MESSAGE_SIZE] = {0};
    char alert_buffer[1024] = {0};
    snprintf(message_buffer, MAX_MESSAGE_SIZE, "Active alerts for %s:\\n\\n", state_code);

    JSON_Value* root_value = json_parse_string(json_str);
    if (!root_value) {
        return NULL;
    }

    JSON_Object* root_object = json_value_get_object(root_value);
    JSON_Array* features = json_object_get_array(root_object, "features");
    size_t feature_count = json_array_get_count(features);

    for (size_t i = 0; i < feature_count; i++) {
        JSON_Object* feature = json_array_get_object(features, i);
        JSON_Object* properties = json_object_get_object(feature, "properties");

        const char* event = json_object_get_string(properties, "event");
        const char* area_desc = json_object_get_string(properties, "areaDesc");
        const char* severity = json_object_get_string(properties, "severity");
        const char* status = json_object_get_string(properties, "status");
        const char* headline = json_object_get_string(properties, "headline");

        if (!event) event = "Unknown";
        if (!area_desc) area_desc = "Unknown";
        if (!severity) severity = "Unknown";
        if (!status) status = "Unknown";
        if (!headline) headline = "No headline";

        snprintf(alert_buffer, sizeof(alert_buffer),
                "Event: %s\\n"
                "Area: %s\\n"
                "Severity: %s\\n"
                "Status: %s\\n"
                "Headline: %s\\n"
                "---\\n",
                event, area_desc, severity, status, headline);

        if (strlen(message_buffer) + strlen(alert_buffer) < MAX_MESSAGE_SIZE) {
            strcat(message_buffer, alert_buffer);
            if (i < feature_count - 1 &&
                strlen(message_buffer) + 1 < MAX_MESSAGE_SIZE) {
                strcat(message_buffer, "\\n");
            }
        } else {
            if (strlen(message_buffer) + 31 < MAX_MESSAGE_SIZE) {
                strcat(message_buffer, "... (more alerts not shown)");
            }
            break;
        }
    }
    json_value_free(root_value);
    return message_buffer;
}

void get_alerts_callback(void* a) {
    if (a == NULL){
       mcp_output_text("Failed to retrieve alerts data", true);
       return;
    }
    JSON_Value* input = json_parse_string(mcp_get_input());
    const char* state = json_object_get_string(json_object(input), "state");
    json_value_free(input);
    mcp_output_text(build_alert_message(a, state), false);
}

void get_forecast_callback2(void* a) {
    if (a == NULL){
       mcp_output_text("Failed to retrieve forecast data", true);
       return;
    }
    mcp_output_text(build_forecast_message(a), false);
}

void get_forecast_callback1(void* a) {
    if (a == NULL) {
        JSON_Value* input = json_parse_string(mcp_get_input());
        const double latitude = json_object_get_number(json_object(input), "latitude");
        const double longitude = json_object_get_number(json_object(input), "longitude");
        json_value_free(input);
        char buffer[1024] = {};
        sprintf(buffer, "Failed to retrieve grid point data for coordinates: %f, %f. This location may not be supported by the NWS API (only US locations are supported).", latitude, longitude);
        mcp_output_text(buffer, true);
        return;
    }

    JSON_Value* data = json_parse_string(a);
    const char* url = json_object_dotget_string(json_object(data), "properties.forecast");
    wasm_promise_callbacks_register(http_get(url), get_forecast_callback2);
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
    wasm_promise_callbacks_register(http_get(url), get_forecast_callback1);
    return 0;
}
