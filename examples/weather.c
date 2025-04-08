// example WASM MCP that can look up weather
#include "inc/mcp.h"

// you could make something like this that returns JSON
// but I think it's nicer to make a JSON file alongside it
// WASM_EXPORT(mcp) char* mcp() {}


// this is the inputSchema
typedef struct {
  char state[2];
} RequestAlert;

typedef struct {
  int latitude;
  int longitude;
} RequestForecast;

// this is the outputschema
typedef struct {
  char event[20];
  char areaDesc[20];
  char severity[20];
  char status[20];
  char headline[20];
} ReturnAlert;
typedef struct {} ReturnForecast;

ReturnAlert reAlert;
ReturnForecast reForecast;

WASM_EXPORT(get_alerts) ReturnAlert* get_alerts(RequestAlert* input) {
  return &reAlert;
}

WASM_EXPORT(get_forecast) ReturnForecast* get_forecast(RequestForecast* input) {
  return &reForecast;
}