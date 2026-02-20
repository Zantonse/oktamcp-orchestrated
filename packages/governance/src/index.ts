#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IgaClient } from "@okta-mcp/core";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerEntitlementTools } from "./tools/entitlements.js";
import { registerBundleTools } from "./tools/bundles.js";
import { registerAccessRequestTools } from "./tools/access-requests.js";

const client = new IgaClient();
const server = new McpServer({
  name: "okta-mcp-governance",
  version: "0.1.0",
});

registerCampaignTools(server, client);
registerEntitlementTools(server, client);
registerBundleTools(server, client);
registerAccessRequestTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
