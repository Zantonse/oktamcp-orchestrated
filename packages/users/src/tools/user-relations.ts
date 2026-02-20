import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerUserRelationTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_get_user_groups",
    "List all groups that a user is a member of. Use this for auditing group memberships, verifying access, or understanding a user's access scope before making changes.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose group memberships to retrieve"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/groups`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_user_apps",
    "List all application links (app assignments) for a user, showing which applications they have access to. Use this for access auditing, offboarding verification, or troubleshooting SSO issues.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose application assignments to retrieve"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/appLinks`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_user_roles",
    "List all admin roles assigned to a user. Use this for privilege auditing to determine if a user has administrator-level access and which admin permissions they hold.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose admin roles to retrieve"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/roles`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
