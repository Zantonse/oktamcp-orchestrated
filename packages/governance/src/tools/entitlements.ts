import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IgaClient } from "@okta-mcp/core";

export function registerEntitlementTools(server: McpServer, client: IgaClient): void {
  server.tool(
    "okta_iga_list_entitlements",
    "List all entitlements available in the Okta IGA system. Entitlements are fine-grained permissions within applications (e.g., 'can approve expenses up to $10k'), more granular than app assignments. Use this to discover available entitlements before assigning them to users. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of entitlements to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of entitlements"),
    },
    async ({ limit, after }) => {
      const resp = await client.get("/entitlements", {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_get_entitlement",
    "Retrieve the full details of a specific entitlement by its ID. Use this to inspect entitlement configuration, associated application, and permission scope. Prefer okta_iga_list_entitlements to discover entitlement IDs first. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      entitlementId: z
        .string()
        .describe("Okta entitlement ID (e.g., obtained from okta_iga_list_entitlements)"),
    },
    async ({ entitlementId }) => {
      const resp = await client.get(`/entitlements/${entitlementId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_list_user_entitlements",
    "List all entitlements currently assigned to a specific user. Use this to audit a user's fine-grained permissions across applications, or to check before assigning or revoking entitlements. More granular than listing app assignments. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      userId: z
        .string()
        .describe("Okta user ID whose entitlements to list (e.g., '00u1abc123XYZ')"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of entitlements to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of results"),
    },
    async ({ userId, limit, after }) => {
      const resp = await client.get(`/users/${userId}/entitlements`, {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_assign_entitlement",
    "Assign a specific entitlement to a user, granting them a fine-grained permission within an application. Use this for precise access control beyond simple app assignment. Prefer this over broad app assignments when only specific permissions are needed. Verify the entitlement ID exists first using okta_iga_list_entitlements. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      userId: z
        .string()
        .describe("Okta user ID to assign the entitlement to (e.g., '00u1abc123XYZ')"),
      entitlementId: z
        .string()
        .describe("Okta entitlement ID to assign to the user (e.g., obtained from okta_iga_list_entitlements)"),
    },
    async ({ userId, entitlementId }) => {
      const resp = await client.post(`/users/${userId}/entitlements`, {
        entitlementId,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_revoke_entitlement",
    "Revoke a specific entitlement from a user, removing a fine-grained permission. This is a destructive operation — the user will immediately lose the specified permission. Use okta_iga_list_user_entitlements to verify the assignment exists before revoking. This action may be logged in the IGA audit trail. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      userId: z
        .string()
        .describe("Okta user ID from whom to revoke the entitlement (e.g., '00u1abc123XYZ')"),
      entitlementId: z
        .string()
        .describe("Okta entitlement ID to revoke from the user (e.g., obtained from okta_iga_list_user_entitlements)"),
    },
    async ({ userId, entitlementId }) => {
      const resp = await client.delete(`/users/${userId}/entitlements/${entitlementId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
