import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IgaClient } from "@okta-mcp/core";

export function registerBundleTools(server: McpServer, client: IgaClient): void {
  server.tool(
    "okta_iga_list_bundles",
    "List all entitlement bundles available in the Okta IGA system. Bundles group multiple entitlements together for role-based provisioning (e.g., 'Engineering Role' = GitHub access + Jira access + AWS read-only). Use this to discover available bundles before assigning them to users. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of bundles to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of bundles"),
    },
    async ({ limit, after }) => {
      const resp = await client.get("/bundles", {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_get_bundle",
    "Retrieve the full details of a specific entitlement bundle by its ID. Use this to inspect which entitlements are included in a bundle before assigning it to users. Prefer okta_iga_list_bundles to discover bundle IDs first. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      bundleId: z
        .string()
        .describe("Okta bundle ID to retrieve (e.g., obtained from okta_iga_list_bundles)"),
    },
    async ({ bundleId }) => {
      const resp = await client.get(`/bundles/${bundleId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_assign_bundle_to_user",
    "Assign an entitlement bundle to a user, granting them all entitlements included in the bundle at once. Use this for role-based provisioning where a set of related permissions must be granted together (e.g., onboarding an engineer). More efficient than assigning entitlements individually. Verify the bundle ID exists using okta_iga_list_bundles before assigning. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      userId: z
        .string()
        .describe("Okta user ID to assign the bundle to (e.g., '00u1abc123XYZ')"),
      bundleId: z
        .string()
        .describe("Okta bundle ID to assign to the user (e.g., obtained from okta_iga_list_bundles)"),
    },
    async ({ userId, bundleId }) => {
      const resp = await client.post(`/users/${userId}/bundles`, {
        bundleId,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_remove_bundle_from_user",
    "Remove an entitlement bundle from a user, revoking all entitlements in that bundle simultaneously. This is a destructive operation — the user immediately loses all permissions granted by the bundle. Use when offboarding a user from a role or when performing access reviews. Verify the assignment exists first using a user entitlement check. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      userId: z
        .string()
        .describe("Okta user ID from whom to remove the bundle (e.g., '00u1abc123XYZ')"),
      bundleId: z
        .string()
        .describe("Okta bundle ID to remove from the user (e.g., obtained from okta_iga_list_bundles)"),
    },
    async ({ userId, bundleId }) => {
      const resp = await client.delete(`/users/${userId}/bundles/${bundleId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
