import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerEventHookTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_event_hooks",
    "List all event hooks configured in the Okta org. Event hooks send asynchronous notifications to external URLs when specific Okta events occur. Use this to audit existing hooks or find a hook ID before updating or deleting it.",
    {},
    async () => {
      const resp = await client.get("/eventHooks");
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_event_hook",
    "Create an event hook that sends asynchronous notifications to an external URL when specified Okta events occur. After creation, call okta_verify_event_hook to complete ownership verification before the hook becomes active.",
    {
      name: z
        .string()
        .describe("Display name for the event hook (must be unique in the org)"),
      events: z
        .object({
          type: z
            .string()
            .describe(
              "Events collection type, typically \"EVENT_TYPE\""
            ),
          items: z
            .array(z.string())
            .describe(
              "List of Okta event type strings to subscribe to, e.g. [\"user.lifecycle.create\", \"user.lifecycle.activate\"]"
            ),
        })
        .describe("Events configuration specifying which Okta event types trigger the hook"),
      channel: z
        .object({
          type: z
            .string()
            .describe("Channel type, typically \"HTTP\""),
          version: z
            .string()
            .describe("Channel version, typically \"1.0.0\""),
          config: z
            .object({
              uri: z
                .string()
                .describe("The HTTPS URL that Okta will send event notifications to"),
              headers: z
                .array(
                  z.object({
                    key: z.string().describe("HTTP header name"),
                    value: z.string().describe("HTTP header value"),
                  })
                )
                .optional()
                .describe("Optional custom HTTP headers to include with each notification"),
              authScheme: z
                .object({
                  type: z
                    .string()
                    .describe("Authentication scheme type, e.g. \"HEADER\""),
                  key: z
                    .string()
                    .describe("Header name for authentication, e.g. \"Authorization\""),
                  value: z
                    .string()
                    .describe("Header value for authentication (token or secret)"),
                })
                .optional()
                .describe("Optional authentication scheme for securing the hook endpoint"),
            })
            .describe("Channel configuration including the endpoint URL and auth details"),
        })
        .describe("Channel configuration defining how Okta delivers events to your endpoint"),
    },
    async ({ name, events, channel }) => {
      const resp = await client.post("/eventHooks", { name, events, channel });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_event_hook",
    "Update an existing event hook's name, subscribed events, or channel configuration. Use okta_list_event_hooks to get the eventHookId. The hook must exist; use okta_create_event_hook to create new hooks.",
    {
      eventHookId: z
        .string()
        .describe("ID of the event hook to update"),
      name: z
        .string()
        .optional()
        .describe("New display name for the event hook"),
      events: z
        .object({
          type: z.string().describe("Events collection type, typically \"EVENT_TYPE\""),
          items: z
            .array(z.string())
            .describe("Updated list of Okta event type strings to subscribe to"),
        })
        .optional()
        .describe("Updated events configuration — replaces all existing event subscriptions"),
      channel: z
        .object({
          type: z.string().describe("Channel type, typically \"HTTP\""),
          version: z.string().describe("Channel version, typically \"1.0.0\""),
          config: z
            .object({
              uri: z.string().describe("The HTTPS URL that Okta will send event notifications to"),
              headers: z
                .array(
                  z.object({
                    key: z.string().describe("HTTP header name"),
                    value: z.string().describe("HTTP header value"),
                  })
                )
                .optional()
                .describe("Optional custom HTTP headers"),
              authScheme: z
                .object({
                  type: z.string().describe("Authentication scheme type, e.g. \"HEADER\""),
                  key: z.string().describe("Header name for authentication"),
                  value: z.string().describe("Header value for authentication"),
                })
                .optional()
                .describe("Optional authentication scheme"),
            })
            .describe("Channel configuration"),
        })
        .optional()
        .describe("Updated channel configuration — replaces the existing endpoint settings"),
    },
    async ({ eventHookId, name, events, channel }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (events !== undefined) body.events = events;
      if (channel !== undefined) body.channel = channel;
      const resp = await client.put(`/eventHooks/${eventHookId}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_activate_event_hook",
    "Activate an event hook so it begins receiving event notifications from Okta. The hook must have been successfully verified with okta_verify_event_hook before activation will work.",
    {
      eventHookId: z
        .string()
        .describe("ID of the event hook to activate"),
    },
    async ({ eventHookId }) => {
      const resp = await client.post(`/eventHooks/${eventHookId}/lifecycle/activate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_event_hook",
    "Deactivate an event hook so it stops receiving event notifications. The hook configuration is preserved and can be reactivated later. An event hook must be INACTIVE before it can be deleted.",
    {
      eventHookId: z
        .string()
        .describe("ID of the event hook to deactivate"),
    },
    async ({ eventHookId }) => {
      const resp = await client.post(`/eventHooks/${eventHookId}/lifecycle/deactivate`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_event_hook",
    "Permanently delete an event hook. The hook must be deactivated first using okta_deactivate_event_hook — attempting to delete an ACTIVE hook will fail. This action is irreversible.",
    {
      eventHookId: z
        .string()
        .describe(
          "ID of the event hook to permanently delete. Must be in INACTIVE status first."
        ),
    },
    async ({ eventHookId }) => {
      await client.delete(`/eventHooks/${eventHookId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Event hook ${eventHookId} has been permanently deleted.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "okta_verify_event_hook",
    "Trigger ownership verification for an event hook. Okta sends a one-time verification request to the hook endpoint. The endpoint must respond with the verification value. This must be called after creating a hook before it will receive events.",
    {
      eventHookId: z
        .string()
        .describe(
          "ID of the event hook to verify. The endpoint at the hook's URI must be running and ready to respond to Okta's verification request."
        ),
    },
    async ({ eventHookId }) => {
      const resp = await client.post(`/eventHooks/${eventHookId}/lifecycle/verify`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
