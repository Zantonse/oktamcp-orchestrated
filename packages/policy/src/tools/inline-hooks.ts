import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

const HOOK_TYPE_ENUM = z.enum([
  "com.okta.oauth2.tokens.transform",
  "com.okta.user.pre-registration",
  "com.okta.saml.tokens.transform",
  "com.okta.user.credential.password.import",
  "com.okta.import.transform",
]);

export function registerInlineHookTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_inline_hooks",
    "List all inline hooks configured in the Okta org. Inline hooks let you call an external service at key points in Okta's processing pipeline (e.g. before token issuance or user registration). Optionally filter by hook type.",
    {
      type: HOOK_TYPE_ENUM.optional().describe(
        "Filter results by hook type. Valid types: com.okta.oauth2.tokens.transform, com.okta.user.pre-registration, com.okta.saml.tokens.transform, com.okta.user.credential.password.import, com.okta.import.transform"
      ),
    },
    async ({ type }) => {
      const resp = await client.get("/inlineHooks", {
        params: { type },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_inline_hook",
    "Retrieve a single inline hook by ID. Returns the hook's type, channel configuration (URL, method, headers), and current status (ACTIVE or INACTIVE).",
    {
      hookId: z.string().describe("Okta inline hook ID to retrieve"),
    },
    async ({ hookId }) => {
      const resp = await client.get(`/inlineHooks/${hookId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_inline_hook",
    "Create a new inline hook. Inline hooks call an external HTTPS endpoint at specific Okta processing points such as token transformation or user pre-registration. The endpoint must respond with the correct Okta inline hook response format within the timeout window.",
    {
      name: z.string().describe("Human-readable name for the inline hook"),
      type: HOOK_TYPE_ENUM.describe(
        "Hook type that determines when Okta calls this hook: com.okta.oauth2.tokens.transform (token issuance), com.okta.user.pre-registration (self-service registration), com.okta.saml.tokens.transform (SAML assertion), com.okta.user.credential.password.import (password import), com.okta.import.transform (user import)"
      ),
      channelUrl: z.string().describe("HTTPS URL of your external endpoint that Okta will call"),
      channelMethod: z.enum(["POST"]).optional().default("POST").describe(
        "HTTP method for the channel request — must be POST"
      ),
      channelHeaders: z.array(z.object({
        key: z.string().describe("Header name"),
        value: z.string().describe("Header value"),
      })).optional().describe(
        "Additional HTTP headers to send with each hook request (e.g. Authorization headers for your endpoint)"
      ),
    },
    async ({ name, type, channelUrl, channelMethod, channelHeaders }) => {
      const body: Record<string, unknown> = {
        name,
        type,
        version: "1.0.0",
        channel: {
          type: "HTTP",
          version: "1.0.0",
          config: {
            uri: channelUrl,
            method: channelMethod ?? "POST",
            headers: channelHeaders ?? [],
          },
        },
      };
      const resp = await client.post("/inlineHooks", body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_inline_hook",
    "Update an existing inline hook. Use this to rename the hook or change its channel configuration (endpoint URL or headers). The hook type cannot be changed after creation.",
    {
      hookId: z.string().describe("Okta inline hook ID to update"),
      name: z.string().optional().describe("New name for the inline hook"),
      channelUrl: z.string().optional().describe("New HTTPS URL for the hook endpoint"),
      channelHeaders: z.array(z.object({
        key: z.string().describe("Header name"),
        value: z.string().describe("Header value"),
      })).optional().describe("New set of HTTP headers to send with hook requests"),
    },
    async ({ hookId, name, channelUrl, channelHeaders }) => {
      // Fetch current config to merge
      const current = await client.get<Record<string, unknown>>(`/inlineHooks/${hookId}`);
      const currentData = current.data as Record<string, unknown>;
      const currentChannel = (currentData.channel ?? {}) as Record<string, unknown>;
      const currentConfig = (currentChannel.config ?? {}) as Record<string, unknown>;

      const body: Record<string, unknown> = {
        name: name ?? currentData.name,
        type: currentData.type,
        version: currentData.version ?? "1.0.0",
        channel: {
          type: currentChannel.type ?? "HTTP",
          version: currentChannel.version ?? "1.0.0",
          config: {
            uri: channelUrl ?? currentConfig.uri,
            method: currentConfig.method ?? "POST",
            headers: channelHeaders ?? currentConfig.headers ?? [],
          },
        },
      };
      const resp = await client.put(`/inlineHooks/${hookId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_activate_inline_hook",
    "Activate an inline hook, enabling Okta to call it during its configured processing events. Hooks are created in INACTIVE state and must be activated before use.",
    {
      hookId: z.string().describe("Okta inline hook ID to activate"),
    },
    async ({ hookId }) => {
      const resp = await client.post(`/inlineHooks/${hookId}/lifecycle/activate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_inline_hook",
    "Deactivate an inline hook, preventing Okta from calling it. Deactivated hooks retain their configuration and can be reactivated later. The hook must be deactivated before it can be deleted.",
    {
      hookId: z.string().describe("Okta inline hook ID to deactivate"),
    },
    async ({ hookId }) => {
      const resp = await client.post(`/inlineHooks/${hookId}/lifecycle/deactivate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_inline_hook",
    "Delete an inline hook. The hook MUST be deactivated first using okta_deactivate_inline_hook. This permanently removes the hook configuration. This action is irreversible.",
    {
      hookId: z.string().describe("Okta inline hook ID to delete — must be deactivated first"),
    },
    async ({ hookId }) => {
      await client.delete(`/inlineHooks/${hookId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, hookId }, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_preview_inline_hook",
    "Test an inline hook by sending a sample payload to the configured endpoint. Returns the hook's response without triggering an actual Okta event. Use this to verify hook endpoint connectivity and response format before activating. The payloadData must match the expected format for the hook's type.",
    {
      hookId: z.string().describe("Okta inline hook ID to test"),
      payloadData: z.record(z.unknown()).describe(
        "Sample event payload to send to the hook endpoint. The structure must match the hook type's expected request format (e.g. for token transform hooks, include a token object with claims)."
      ),
    },
    async ({ hookId, payloadData }) => {
      const resp = await client.post(`/inlineHooks/${hookId}/execute`, payloadData);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
