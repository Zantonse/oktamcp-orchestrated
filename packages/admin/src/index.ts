#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerRoleTools } from "./tools/roles.js";
import { registerSystemLogTools } from "./tools/system-log.js";
import { registerDeviceTools } from "./tools/devices.js";
import { registerEventHookTools } from "./tools/event-hooks.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-admin",
  version: "0.1.0",
});

registerRoleTools(server, client);
registerSystemLogTools(server, client);
registerDeviceTools(server, client);
registerEventHookTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
