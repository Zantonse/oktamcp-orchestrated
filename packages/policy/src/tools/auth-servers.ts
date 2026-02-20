import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerAuthServerTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_auth_servers",
    "List all custom authorization servers in the Okta org. Returns server metadata including issuer URI, audiences, and status. Use 'q' to filter by name. Supports cursor-based pagination.",
    {
      q: z.string().optional().describe("Search by authorization server name (partial match)"),
      limit: z.number().min(1).max(200).optional().describe("Maximum number of results to return (default 200, max 200)"),
      after: z.string().optional().describe("Pagination cursor from a previous response to fetch the next page"),
    },
    async ({ q, limit, after }) => {
      const resp = await client.get("/authorizationServers", {
        params: { q, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_auth_server",
    "Retrieve a single authorization server by ID. Returns full configuration including issuer URI, audiences, credentials, and current status.",
    {
      authServerId: z.string().describe("Okta authorization server ID"),
    },
    async ({ authServerId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_auth_server",
    "Create a new custom authorization server. Authorization servers issue OAuth2/OIDC tokens for a set of audiences. After creation, add scopes, claims, and access policies to fully configure the server.",
    {
      name: z.string().describe("Human-readable name for the authorization server"),
      description: z.string().describe("Description of the authorization server's purpose"),
      audiences: z.array(z.string()).describe("Array of audience URIs this server issues tokens for (e.g. [\"https://api.example.com\"])"),
    },
    async ({ name, description, audiences }) => {
      const resp = await client.post("/authorizationServers", {
        name,
        description,
        audiences,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_auth_server",
    "Update an existing authorization server's configuration. Only the fields provided will be updated. Use this to change the name, description, or audiences.",
    {
      authServerId: z.string().describe("Okta authorization server ID to update"),
      name: z.string().optional().describe("New name for the authorization server"),
      description: z.string().optional().describe("New description for the authorization server"),
      audiences: z.array(z.string()).optional().describe("New array of audience URIs for the authorization server"),
    },
    async ({ authServerId, name, description, audiences }) => {
      // First fetch current config to merge
      const current = await client.get<Record<string, unknown>>(`/authorizationServers/${authServerId}`);
      const currentData = current.data as Record<string, unknown>;
      const body: Record<string, unknown> = {
        name: name ?? currentData.name,
        description: description ?? currentData.description,
        audiences: audiences ?? currentData.audiences,
      };
      const resp = await client.put(`/authorizationServers/${authServerId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_auth_server",
    "Deactivate a custom authorization server. Deactivated servers stop issuing tokens but retain their configuration. The server must be deactivated before it can be deleted.",
    {
      authServerId: z.string().describe("Okta authorization server ID to deactivate"),
    },
    async ({ authServerId }) => {
      const resp = await client.post(`/authorizationServers/${authServerId}/lifecycle/deactivate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_auth_server",
    "Delete a custom authorization server. The server MUST be deactivated first using okta_deactivate_auth_server. This removes all associated policies, scopes, and claims. This action is irreversible.",
    {
      authServerId: z.string().describe("Okta authorization server ID to delete — must be deactivated first"),
    },
    async ({ authServerId }) => {
      await client.delete(`/authorizationServers/${authServerId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, authServerId }, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_rotate_auth_server_keys",
    "Rotate the signing keys for an authorization server. WARNING: This invalidates all existing tokens issued by this server. Integrations relying on the old keys will break until they fetch the new JWKS. Only rotate during planned maintenance windows.",
    {
      authServerId: z.string().describe("Okta authorization server ID whose signing keys will be rotated"),
      use: z.enum(["sig"]).describe("Key use — must be 'sig' (signing keys)"),
    },
    async ({ authServerId, use }) => {
      const resp = await client.post(
        `/authorizationServers/${authServerId}/credentials/lifecycle/keyRotate`,
        { use }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_list_auth_server_keys",
    "List the public signing keys for an authorization server. Returns the JWKS (JSON Web Key Set) used to verify tokens issued by this server. Use this to inspect key IDs (kid) and expiration.",
    {
      authServerId: z.string().describe("Okta authorization server ID whose keys will be listed"),
    },
    async ({ authServerId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/credentials/keys`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
