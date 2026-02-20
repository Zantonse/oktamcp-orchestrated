import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerScopeTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_scopes",
    "List all OAuth2 scopes for a custom authorization server. Scopes define the access permissions that clients can request. Supports filtering by name and cursor-based pagination.",
    {
      authServerId: z.string().describe("Okta authorization server ID whose scopes will be listed"),
      q: z.string().optional().describe("Filter scopes by name (partial match)"),
      limit: z.number().min(1).max(200).optional().describe("Maximum number of scopes to return (default 200, max 200)"),
      after: z.string().optional().describe("Pagination cursor from a previous response to fetch the next page"),
    },
    async ({ authServerId, q, limit, after }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/scopes`, {
        params: { q, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_scope",
    "Retrieve a single OAuth2 scope by ID from a custom authorization server. Returns the scope's name, description, consent setting, and whether it is included in metadata.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the scope"),
      scopeId: z.string().describe("Okta scope ID to retrieve"),
    },
    async ({ authServerId, scopeId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/scopes/${scopeId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_scope",
    "Create an OAuth2 scope on a custom authorization server. Scopes define the granular permissions that access tokens can contain. The consent setting controls whether end users see a consent screen: REQUIRED always shows consent, IMPLICIT skips consent for trusted first-party apps.",
    {
      authServerId: z.string().describe("Okta authorization server ID to add the scope to"),
      name: z.string().describe("Scope name as it appears in token requests (e.g. 'read:users' or 'openid')"),
      description: z.string().optional().describe("Human-readable description shown on the consent screen"),
      consent: z.enum(["REQUIRED", "IMPLICIT"]).describe("Consent behavior: REQUIRED always prompts the user, IMPLICIT skips consent for trusted apps"),
      default: z.boolean().optional().describe("Whether this scope is included in tokens by default when no scopes are explicitly requested"),
    },
    async ({ authServerId, name, description, consent, default: isDefault }) => {
      const resp = await client.post(`/authorizationServers/${authServerId}/scopes`, {
        name,
        description,
        consent,
        default: isDefault,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_scope",
    "Update an existing OAuth2 scope on a custom authorization server. Only the provided fields will be changed. Use this to rename a scope, update its description, or change its consent behavior.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the scope"),
      scopeId: z.string().describe("Okta scope ID to update"),
      name: z.string().optional().describe("New scope name"),
      description: z.string().optional().describe("New human-readable description"),
      consent: z.enum(["REQUIRED", "IMPLICIT"]).optional().describe("New consent behavior: REQUIRED always prompts the user, IMPLICIT skips consent for trusted apps"),
    },
    async ({ authServerId, scopeId, name, description, consent }) => {
      // Fetch current to merge
      const current = await client.get<Record<string, unknown>>(
        `/authorizationServers/${authServerId}/scopes/${scopeId}`
      );
      const currentData = current.data as Record<string, unknown>;
      const body: Record<string, unknown> = {
        name: name ?? currentData.name,
        description: description ?? currentData.description,
        consent: consent ?? currentData.consent,
      };
      const resp = await client.put(
        `/authorizationServers/${authServerId}/scopes/${scopeId}`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_scope",
    "Delete an OAuth2 scope from a custom authorization server. Tokens that already include this scope remain valid until they expire, but new token requests will fail if they include the deleted scope name.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the scope"),
      scopeId: z.string().describe("Okta scope ID to delete"),
    },
    async ({ authServerId, scopeId }) => {
      await client.delete(`/authorizationServers/${authServerId}/scopes/${scopeId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, authServerId, scopeId }, null, 2) }],
      };
    }
  );
}
