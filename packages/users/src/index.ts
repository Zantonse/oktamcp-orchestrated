#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerUserLifecycleTools } from "./tools/user-lifecycle.js";
import { registerUserRelationTools } from "./tools/user-relations.js";
import { registerFactorTools } from "./tools/factors.js";
import { registerSessionTools } from "./tools/sessions.js";

const client = new OktaClient({
  requiredScopes: [
    "okta.users.read",
    "okta.users.manage",
    "okta.groups.read",
    "okta.apps.read",
    "okta.roles.read",
    "okta.authenticators.read",
    "okta.authenticators.manage",
    "okta.sessions.read",
    "okta.sessions.manage",
  ],
});
const server = new McpServer({
  name: "okta-mcp-users",
  version: "0.1.0",
});

registerUserLifecycleTools(server, client);
registerUserRelationTools(server, client);
registerFactorTools(server, client);
registerSessionTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
