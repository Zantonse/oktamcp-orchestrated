import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

const signOnModeEnum = z.enum([
  "SAML_2_0",
  "OPENID_CONNECT",
  "BOOKMARK",
  "AUTO_LOGIN",
  "BASIC_AUTH",
  "BROWSER_PLUGIN",
  "SECURE_PASSWORD_STORE",
  "WS_FEDERATION",
  "SWA",
]);

export function registerAppManagementTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_apps",
    "List applications in the Okta org with optional label search and status filtering. Use 'q' for label-based search or 'filter' for SCIM-style expressions such as status eq \"ACTIVE\". Returns paginated results — use 'after' cursor for subsequent pages.",
    {
      q: z
        .string()
        .optional()
        .describe(
          "Search string matched against application label. Returns apps whose label starts with this value."
        ),
      filter: z
        .string()
        .optional()
        .describe(
          "Filter expression for app status or type, e.g. status eq \"ACTIVE\" or name eq \"template_saml_2_0\""
        ),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of apps to return per page (default 20, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response to fetch the next page of results"),
    },
    async ({ q, filter, limit, after }) => {
      const resp = await client.get("/apps", {
        params: { q, filter, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_app",
    "Retrieve a single application by its Okta application ID. Returns the full application object including label, status, sign-on mode, settings, and credentials.",
    {
      appId: z.string().describe("Okta application ID (e.g. 0oa1b2c3d4e5f6g7h8i9)"),
    },
    async ({ appId }) => {
      const resp = await client.get(`/apps/${appId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_app",
    "Create a new application in Okta. The signOnMode determines the authentication type (SAML_2_0, OPENID_CONNECT, etc.). Use z.record for app-specific settings as they vary by signOnMode. The app starts in ACTIVE status by default unless activate=false is passed in settings.",
    {
      label: z
        .string()
        .describe("Display name of the application as it appears in the Okta dashboard"),
      signOnMode: signOnModeEnum.describe(
        "Authentication protocol for the application: SAML_2_0, OPENID_CONNECT, BOOKMARK, AUTO_LOGIN, BASIC_AUTH, BROWSER_PLUGIN, SECURE_PASSWORD_STORE, WS_FEDERATION, or SWA"
      ),
      settings: z
        .record(z.unknown())
        .optional()
        .describe(
          "Application-specific settings object. Structure varies by signOnMode — consult Okta API docs for the correct shape per app type."
        ),
    },
    async ({ label, signOnMode, settings }) => {
      const body: Record<string, unknown> = { label, signOnMode };
      if (settings !== undefined) {
        body.settings = settings;
      }
      const resp = await client.post("/apps", body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_app",
    "Update an existing application's configuration. Performs a full PUT replacement of the application object — include all fields you want to retain, not just the changed ones. To change only the label or settings, first call okta_get_app to retrieve the current state.",
    {
      appId: z.string().describe("Okta application ID of the app to update"),
      label: z
        .string()
        .optional()
        .describe("New display name for the application"),
      signOnMode: signOnModeEnum
        .optional()
        .describe("Authentication protocol — changing this may require reconfiguring the app settings"),
      settings: z
        .record(z.unknown())
        .optional()
        .describe(
          "Updated application-specific settings. Structure varies by signOnMode — include the full settings object to avoid partial overwrites."
        ),
    },
    async ({ appId, label, signOnMode, settings }) => {
      // Build update body with only provided fields
      const body: Record<string, unknown> = {};
      if (label !== undefined) body.label = label;
      if (signOnMode !== undefined) body.signOnMode = signOnMode;
      if (settings !== undefined) body.settings = settings;
      const resp = await client.put(`/apps/${appId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_activate_app",
    "Activate an application that is currently INACTIVE. Once activated, the app becomes available to assigned users and groups. Use after creating a new app that was created in inactive state or after re-enabling a previously deactivated app.",
    {
      appId: z.string().describe("Okta application ID of the app to activate"),
    },
    async ({ appId }) => {
      const resp = await client.post(`/apps/${appId}/lifecycle/activate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_app",
    "Deactivate an application, making it unavailable to users. The app and its assignments are preserved but users can no longer access it via SSO. Deactivation is required before deleting an app — call this before okta_delete_app.",
    {
      appId: z.string().describe("Okta application ID of the app to deactivate"),
    },
    async ({ appId }) => {
      const resp = await client.post(`/apps/${appId}/lifecycle/deactivate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_app",
    "Permanently delete an application. The app MUST be deactivated first — call okta_deactivate_app before this. This removes all user and group assignments. This action is irreversible; deleted apps cannot be recovered.",
    {
      appId: z.string().describe("Okta application ID of the app to permanently delete (must be INACTIVE)"),
    },
    async ({ appId }) => {
      await client.delete(`/apps/${appId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: `Application ${appId} has been permanently deleted.` }, null, 2),
          },
        ],
      };
    }
  );
}
