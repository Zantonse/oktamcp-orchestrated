import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerClaimTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_claims",
    "List all custom claims for a custom authorization server. Claims are key-value pairs embedded in access tokens or ID tokens. Returns claim names, value types, and whether they apply to access or identity tokens.",
    {
      authServerId: z.string().describe("Okta authorization server ID whose claims will be listed"),
    },
    async ({ authServerId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/claims`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_claim",
    "Retrieve a single claim by ID from a custom authorization server. Returns the claim's name, value type, expression or group filter, and token type it appears in.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the claim"),
      claimId: z.string().describe("Okta claim ID to retrieve"),
    },
    async ({ authServerId, claimId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/claims/${claimId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_claim",
    "Create a custom claim on a custom authorization server. Claims add user attributes or computed values to tokens. Use EXPRESSION type with Okta Expression Language (e.g. 'user.email') for dynamic values, or GROUPS to include group membership. RESOURCE claims appear in access tokens; IDENTITY claims appear in ID tokens.",
    {
      authServerId: z.string().describe("Okta authorization server ID to add the claim to"),
      name: z.string().describe("Claim name as it will appear in the token (e.g. 'email', 'department', 'groups')"),
      valueType: z.enum(["EXPRESSION", "GROUPS", "SYSTEM", "IDENTITY_PROVIDER"]).describe(
        "How the claim value is derived: EXPRESSION uses Okta Expression Language, GROUPS includes group names matching a filter, SYSTEM uses Okta system values, IDENTITY_PROVIDER uses IdP attributes"
      ),
      value: z.string().describe(
        "The claim value or expression. For EXPRESSION: an EL expression like 'user.email' or 'String.substringAfter(user.email, \"@\")'. For GROUPS: a regex filter to match group names."
      ),
      claimType: z.enum(["RESOURCE", "IDENTITY"]).describe(
        "Token type the claim appears in: RESOURCE adds the claim to access tokens, IDENTITY adds it to ID tokens"
      ),
      conditions: z.record(z.unknown()).optional().describe(
        "Optional conditions object to restrict the claim to specific scopes (e.g. { scopes: [\"profile\"] })"
      ),
    },
    async ({ authServerId, name, valueType, value, claimType, conditions }) => {
      const body: Record<string, unknown> = {
        name,
        valueType,
        value,
        claimType,
      };
      if (conditions !== undefined) {
        body.conditions = conditions;
      }
      const resp = await client.post(`/authorizationServers/${authServerId}/claims`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_claim",
    "Update an existing claim on a custom authorization server. Only the provided fields will be changed. Use this to rename a claim, change its expression, or switch which token type it appears in.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the claim"),
      claimId: z.string().describe("Okta claim ID to update"),
      name: z.string().optional().describe("New claim name"),
      valueType: z.enum(["EXPRESSION", "GROUPS", "SYSTEM", "IDENTITY_PROVIDER"]).optional().describe(
        "New value derivation method: EXPRESSION, GROUPS, SYSTEM, or IDENTITY_PROVIDER"
      ),
      value: z.string().optional().describe(
        "New claim value or EL expression (e.g. 'user.email' or a group name regex)"
      ),
      claimType: z.enum(["RESOURCE", "IDENTITY"]).optional().describe(
        "New token type: RESOURCE for access tokens, IDENTITY for ID tokens"
      ),
    },
    async ({ authServerId, claimId, name, valueType, value, claimType }) => {
      // Fetch current to merge
      const current = await client.get<Record<string, unknown>>(
        `/authorizationServers/${authServerId}/claims/${claimId}`
      );
      const currentData = current.data as Record<string, unknown>;
      const body: Record<string, unknown> = {
        name: name ?? currentData.name,
        valueType: valueType ?? currentData.valueType,
        value: value ?? currentData.value,
        claimType: claimType ?? currentData.claimType,
      };
      const resp = await client.put(
        `/authorizationServers/${authServerId}/claims/${claimId}`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_claim",
    "Delete a custom claim from a custom authorization server. Existing tokens that contain the claim remain valid until expiry, but new tokens will no longer include this claim. This action is irreversible.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the claim"),
      claimId: z.string().describe("Okta claim ID to delete"),
    },
    async ({ authServerId, claimId }) => {
      await client.delete(`/authorizationServers/${authServerId}/claims/${claimId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, authServerId, claimId }, null, 2) }],
      };
    }
  );
}
