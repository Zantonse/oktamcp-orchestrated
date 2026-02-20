import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerDeviceTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_devices",
    "List devices enrolled in the Okta org. Supports SCIM filter expressions to narrow results by platform, status, or other device attributes. Use this to audit enrolled devices or find devices belonging to specific users.",
    {
      search: z
        .string()
        .optional()
        .describe(
          "SCIM filter expression to search devices, e.g. status eq \"ACTIVE\" or profile.platform eq \"WINDOWS\""
        ),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of devices to return per page (default 20, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response to fetch the next page"),
    },
    async ({ search, limit, after }) => {
      const resp = await client.get("/devices", {
        params: { search, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_device",
    "Retrieve detailed information about a specific device by its ID. Returns device profile, status, platform details, and enrollment metadata.",
    {
      deviceId: z
        .string()
        .describe("Okta device ID to retrieve details for"),
    },
    async ({ deviceId }) => {
      const resp = await client.get(`/devices/${deviceId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_list_device_users",
    "List all users associated with a specific device. A device can be shared by multiple users, each with different enrollment states. Useful for determining device ownership before taking administrative action.",
    {
      deviceId: z
        .string()
        .describe("Okta device ID to list associated users for"),
    },
    async ({ deviceId }) => {
      const resp = await client.get(`/devices/${deviceId}/users`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_device",
    "Deactivate a device in Okta, blocking it from authenticating. The device record is retained but the device cannot be used for authentication until reactivated. Use this for compromised or lost devices. For temporary holds, prefer okta_suspend_device.",
    {
      deviceId: z
        .string()
        .describe("Okta device ID to deactivate"),
    },
    async ({ deviceId }) => {
      await client.post(`/devices/${deviceId}/lifecycle/deactivate`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, message: `Device ${deviceId} has been deactivated` },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "okta_delete_device",
    "Permanently remove a device record from Okta. This is irreversible — the device will need to re-enroll through the Okta Verify registration flow. Use okta_deactivate_device or okta_suspend_device for temporary actions. Only delete devices that are in DEACTIVATED status.",
    {
      deviceId: z
        .string()
        .describe(
          "Okta device ID to permanently delete. Ensure device is DEACTIVATED first."
        ),
    },
    async ({ deviceId }) => {
      await client.delete(`/devices/${deviceId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Device ${deviceId} has been permanently deleted. The device must re-enroll to use Okta.`,
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
    "okta_suspend_device",
    "Temporarily suspend a device. Unlike deactivation, suspended devices can be quickly restored with okta_unsuspend_device. Use for temporary investigations or policy enforcement. The device record and enrollment data are preserved.",
    {
      deviceId: z
        .string()
        .describe("Okta device ID to temporarily suspend"),
    },
    async ({ deviceId }) => {
      await client.post(`/devices/${deviceId}/lifecycle/suspend`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Device ${deviceId} has been suspended. Use okta_unsuspend_device to restore access.`,
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
    "okta_unsuspend_device",
    "Restore a suspended device back to ACTIVE status. Use this to reverse a previous okta_suspend_device action once the investigation or policy hold is resolved.",
    {
      deviceId: z
        .string()
        .describe("Okta device ID to restore from suspended status"),
    },
    async ({ deviceId }) => {
      await client.post(`/devices/${deviceId}/lifecycle/unsuspend`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Device ${deviceId} has been unsuspended and is now ACTIVE.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
