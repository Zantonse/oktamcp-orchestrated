import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerSessionTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_user_sessions",
    "List all active sessions for a specific user, showing where and when they are currently authenticated. Use this to audit active logins before revoking access or during a security investigation.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose active sessions to list"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/sessions`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_revoke_user_sessions",
    "Revoke ALL active sessions for a user, forcing them to re-authenticate everywhere. Use for security incidents or when a user reports compromised credentials. For revoking a single specific session, use okta_revoke_session instead.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose ALL active sessions should be revoked"),
    },
    async ({ userId }) => {
      const resp = await client.delete(`/users/${encodeURIComponent(userId)}/sessions`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data ?? { success: true }, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_revoke_session",
    "Revoke a single Okta session by its session ID. Use this for targeted session termination when you know the specific session to invalidate. To revoke all sessions for a user at once, use okta_revoke_user_sessions instead.",
    {
      sessionId: z.string().describe("Okta session ID of the specific session to revoke"),
    },
    async ({ sessionId }) => {
      const resp = await client.delete(`/sessions/${encodeURIComponent(sessionId)}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data ?? { success: true }, null, 2) }],
      };
    }
  );
}
