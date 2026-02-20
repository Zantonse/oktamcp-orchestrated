import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerSystemLogTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_get_system_log",
    "Query the Okta system log for audit events. Supports filter expressions, keyword search, date ranges, and pagination. Use 'since' and 'until' (ISO 8601 format) to narrow results. Filter uses Okta expression syntax (e.g., eventType eq \"user.session.start\"). Okta retains logs for 90 days.",
    {
      since: z
        .string()
        .optional()
        .describe(
          "Start of date range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z). Defaults to 7 days ago if not set."
        ),
      until: z
        .string()
        .optional()
        .describe(
          "End of date range in ISO 8601 format (e.g. 2024-01-31T23:59:59Z). Defaults to now if not set."
        ),
      filter: z
        .string()
        .optional()
        .describe(
          "Okta filter expression, e.g. eventType eq \"user.session.start\" or actor.id eq \"00u1234\""
        ),
      q: z
        .string()
        .optional()
        .describe(
          "Keyword search across all event fields. Use filter for precise queries."
        ),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of events to return (default 100, max 1000)"),
      sortOrder: z
        .enum(["ASCENDING", "DESCENDING"])
        .optional()
        .describe("Sort order by published date. DESCENDING returns newest events first."),
      after: z
        .string()
        .optional()
        .describe(
          "Pagination cursor from the Link header of a previous response. Use to fetch the next page of results."
        ),
    },
    async ({ since, until, filter, q, limit, sortOrder, after }) => {
      const resp = await client.get("/logs", {
        params: { since, until, filter, q, limit, sortOrder, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_system_log_events_for_user",
    "Get all system log events where a specific user was the actor. Useful for auditing a user's actions, investigating suspicious activity, or reviewing changes made by an admin. Returns events filtered by actor.id.",
    {
      userId: z
        .string()
        .describe("Okta user ID whose actions to audit in the system log"),
      since: z
        .string()
        .optional()
        .describe("Start of date range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)"),
      until: z
        .string()
        .optional()
        .describe("End of date range in ISO 8601 format (e.g. 2024-01-31T23:59:59Z)"),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of events to return (default 100, max 1000)"),
    },
    async ({ userId, since, until, limit }) => {
      const filter = `actor.id eq "${userId}"`;
      const resp = await client.get("/logs", {
        params: { filter, since, until, limit },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_system_log_events_for_app",
    "Get all system log events related to a specific application. Useful for auditing app access, investigating SSO failures, or reviewing user assignment changes for an application. Returns events where the app is the target.",
    {
      appId: z
        .string()
        .describe("Okta application ID to retrieve system log events for"),
      since: z
        .string()
        .optional()
        .describe("Start of date range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)"),
      until: z
        .string()
        .optional()
        .describe("End of date range in ISO 8601 format (e.g. 2024-01-31T23:59:59Z)"),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of events to return (default 100, max 1000)"),
    },
    async ({ appId, since, until, limit }) => {
      const filter = `target.id eq "${appId}" and target.type eq "AppInstance"`;
      const resp = await client.get("/logs", {
        params: { filter, since, until, limit },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_system_log_failed_logins",
    "Get failed login attempts from the system log within a recent time window. Defaults to the last 24 hours. Useful for security investigations and detecting brute-force attempts.",
    {
      hoursAgo: z
        .number()
        .min(1)
        .max(2160)
        .optional()
        .describe(
          "Number of hours back to search for failed logins (default 24, max 2160 = 90 days)"
        ),
    },
    async ({ hoursAgo = 24 }) => {
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
      const filter = `eventType eq "user.session.start" and outcome.result eq "FAILURE"`;
      const resp = await client.get("/logs", {
        params: { filter, since },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_system_log_admin_actions",
    "Get admin actions from the system log — specifically events with eventType starting with 'user.account'. Use this to audit privileged administrative activity such as password resets, account unlocks, and profile changes.",
    {
      since: z
        .string()
        .optional()
        .describe("Start of date range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)"),
      until: z
        .string()
        .optional()
        .describe("End of date range in ISO 8601 format (e.g. 2024-01-31T23:59:59Z)"),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of events to return (default 100, max 1000)"),
    },
    async ({ since, until, limit }) => {
      const filter = `eventType sw "user.account"`;
      const resp = await client.get("/logs", {
        params: { filter, since, until, limit },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
