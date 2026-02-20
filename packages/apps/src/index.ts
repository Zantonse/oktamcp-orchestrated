#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerAppManagementTools } from "./tools/app-management.js";
import { registerAppUserTools } from "./tools/app-users.js";
import { registerAppGroupTools } from "./tools/app-groups.js";
import { registerAppCredentialTools } from "./tools/app-credentials.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-apps",
  version: "0.1.0",
});

registerAppManagementTools(server, client);
registerAppUserTools(server, client);
registerAppGroupTools(server, client);
registerAppCredentialTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
