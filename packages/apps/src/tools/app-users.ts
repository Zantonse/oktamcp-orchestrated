import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerAppUserTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_app_users",
    "List all users assigned to a specific application. Returns app-level user objects that include both the base user profile and any app-specific profile attributes. Use pagination params to page through large assignments.",
    {
      appId: z.string().describe("Okta application ID whose assigned users to list"),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of assigned users to return per page (default 50, max 500)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response to fetch the next page of results"),
    },
    async ({ appId, limit, after }) => {
      const resp = await client.get(`/apps/${appId}/users`, {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_app_user",
    "Retrieve the assignment details for a specific user assigned to an application. Returns both the base user profile and the app-specific profile (e.g. mapped attributes, roles). Use this to inspect or verify individual user assignment details.",
    {
      appId: z.string().describe("Okta application ID"),
      userId: z.string().describe("Okta user ID of the assigned user to retrieve"),
    },
    async ({ appId, userId }) => {
      const resp = await client.get(`/apps/${appId}/users/${userId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_assign_user_to_app",
    "Assign a user to an application, granting them access via SSO. Optionally provide app-specific profile attributes that override the default attribute mapping. The user must already exist in Okta before assignment.",
    {
      appId: z.string().describe("Okta application ID to assign the user to"),
      id: z.string().describe("Okta user ID of the user to assign to the application"),
      profile: z
        .record(z.unknown())
        .optional()
        .describe(
          "App-level user profile attributes specific to this application (e.g. username, role). Structure varies per application type."
        ),
    },
    async ({ appId, id, profile }) => {
      const body: Record<string, unknown> = { id };
      if (profile !== undefined) {
        body.profile = profile;
      }
      const resp = await client.post(`/apps/${appId}/users`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_app_user",
    "Update the app-level profile for a user already assigned to an application. Use this to modify app-specific attributes such as the username, role, or custom mapped attributes without changing the base Okta user profile.",
    {
      appId: z.string().describe("Okta application ID"),
      userId: z.string().describe("Okta user ID of the assigned user to update"),
      profile: z
        .record(z.unknown())
        .describe(
          "Updated app-level user profile attributes. Structure varies per application type — include all attributes to avoid partial overwrites."
        ),
    },
    async ({ appId, userId, profile }) => {
      const resp = await client.post(`/apps/${appId}/users/${userId}`, { profile });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_remove_user_from_app",
    "Remove a user's assignment from an application, revoking their SSO access. The user's Okta account is not affected — only the application assignment is removed. Active sessions may continue until they expire.",
    {
      appId: z.string().describe("Okta application ID to remove the user from"),
      userId: z.string().describe("Okta user ID of the user to remove from the application"),
    },
    async ({ appId, userId }) => {
      await client.delete(`/apps/${appId}/users/${userId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, message: `User ${userId} has been removed from application ${appId}.` },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
