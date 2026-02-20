import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerAppGroupTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_app_groups",
    "List all groups assigned to a specific application. Returns group assignment objects that include the group ID, priority, and any app-specific profile attributes. Use pagination params to page through large group assignments.",
    {
      appId: z.string().describe("Okta application ID whose assigned groups to list"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of assigned groups to return per page (default 20, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response to fetch the next page of results"),
    },
    async ({ appId, limit, after }) => {
      const resp = await client.get(`/apps/${appId}/groups`, {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_assign_group_to_app",
    "Assign a group to an application, granting all group members access via SSO. Priority controls which group mapping wins when a user belongs to multiple groups assigned to the same app — lower number means higher priority. Optionally provide app-specific profile attributes for the group mapping.",
    {
      appId: z.string().describe("Okta application ID to assign the group to"),
      groupId: z.string().describe("Okta group ID of the group to assign to the application"),
      priority: z
        .number()
        .optional()
        .describe(
          "Assignment priority for conflict resolution when a user belongs to multiple assigned groups. Lower number = higher priority (e.g. 0 is highest)."
        ),
      profile: z
        .record(z.unknown())
        .optional()
        .describe(
          "App-specific profile attributes for the group assignment. Structure varies per application type."
        ),
    },
    async ({ appId, groupId, priority, profile }) => {
      const body: Record<string, unknown> = {};
      if (priority !== undefined) body.priority = priority;
      if (profile !== undefined) body.profile = profile;
      const resp = await client.put(`/apps/${appId}/groups/${groupId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_remove_group_from_app",
    "Remove a group's assignment from an application, revoking SSO access for all group members who are not individually assigned. The group and its members are not affected in Okta — only the application assignment is removed.",
    {
      appId: z.string().describe("Okta application ID to remove the group from"),
      groupId: z.string().describe("Okta group ID of the group to remove from the application"),
    },
    async ({ appId, groupId }) => {
      await client.delete(`/apps/${appId}/groups/${groupId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, message: `Group ${groupId} has been removed from application ${appId}.` },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
