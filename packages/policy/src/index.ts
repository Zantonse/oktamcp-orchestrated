#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerAuthServerTools } from "./tools/auth-servers.js";
import { registerScopeTools } from "./tools/scopes.js";
import { registerClaimTools } from "./tools/claims.js";
import { registerAuthPolicyTools } from "./tools/auth-policies.js";
import { registerInlineHookTools } from "./tools/inline-hooks.js";

const client = new OktaClient({
  requiredScopes: [
    "okta.policies.read",
    "okta.policies.manage",
    "okta.authorizationServers.read",
    "okta.authorizationServers.manage",
    "okta.inlineHooks.read",
    "okta.inlineHooks.manage",
  ],
});
const server = new McpServer({
  name: "okta-mcp-policy",
  version: "0.1.0",
});

registerAuthServerTools(server, client);
registerScopeTools(server, client);
registerClaimTools(server, client);
registerAuthPolicyTools(server, client);
registerInlineHookTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
