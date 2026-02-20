import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

const adminRoleTypeEnum = z.enum([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "APP_ADMIN",
  "USER_ADMIN",
  "HELP_DESK_ADMIN",
  "READ_ONLY_ADMIN",
  "MOBILE_ADMIN",
  "API_ACCESS_MANAGEMENT_ADMIN",
  "REPORT_ADMIN",
  "GROUP_MEMBERSHIP_ADMIN",
]);

export function registerRoleTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_roles",
    "List all available administrator roles in the Okta org. Returns built-in and custom admin roles with their IDs and descriptions. Use this to discover role types before assigning them to users or groups.",
    {
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of roles to return per page (default 20, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from the previous response to fetch the next page"),
    },
    async ({ limit, after }) => {
      const resp = await client.get("/iam/roles", {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_list_user_admin_roles",
    "List all administrative roles currently assigned to a specific user. Use this to audit a user's admin privileges before making changes or troubleshooting access issues.",
    {
      userId: z
        .string()
        .describe("Okta user ID (e.g. 00u1234567890) whose admin roles to list"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${userId}/roles`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_assign_admin_role_to_user",
    "Assign an administrative role to a user. WARNING: SUPER_ADMIN grants complete control over the entire Okta org, including the ability to create/delete other admins. Use the principle of least privilege — prefer USER_ADMIN or HELP_DESK_ADMIN for most use cases.",
    {
      userId: z
        .string()
        .describe("Okta user ID of the user to assign the admin role to"),
      type: adminRoleTypeEnum.describe(
        "Admin role type to assign. SUPER_ADMIN grants full org control. Prefer USER_ADMIN, HELP_DESK_ADMIN, or READ_ONLY_ADMIN for limited access."
      ),
    },
    async ({ userId, type }) => {
      const resp = await client.post(`/users/${userId}/roles`, { type });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_remove_admin_role_from_user",
    "Remove an administrative role from a user. This immediately revokes the user's admin access for the specified role. Use okta_list_user_admin_roles to get the roleId before calling this.",
    {
      userId: z
        .string()
        .describe("Okta user ID of the user to remove the admin role from"),
      roleId: z
        .string()
        .describe(
          "Role assignment ID (not the role type string) — retrieve this from okta_list_user_admin_roles"
        ),
    },
    async ({ userId, roleId }) => {
      await client.delete(`/users/${userId}/roles/${roleId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, message: `Role ${roleId} removed from user ${userId}` },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "okta_list_group_admin_roles",
    "List all administrative roles currently assigned to a group. Every member of the group inherits these roles. Use this to audit group-based admin privileges.",
    {
      groupId: z
        .string()
        .describe("Okta group ID whose admin role assignments to list"),
    },
    async ({ groupId }) => {
      const resp = await client.get(`/groups/${groupId}/roles`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_assign_admin_role_to_group",
    "Assign an administrative role to all members of a group. Every user in the group receives the role. WARNING: Be extremely careful with SUPER_ADMIN — it gives full org control to all group members. Prefer USER_ADMIN or HELP_DESK_ADMIN for limited delegation.",
    {
      groupId: z
        .string()
        .describe("Okta group ID to assign the admin role to"),
      type: adminRoleTypeEnum.describe(
        "Admin role type to assign to all group members. SUPER_ADMIN gives all members full org control — use sparingly."
      ),
    },
    async ({ groupId, type }) => {
      const resp = await client.post(`/groups/${groupId}/roles`, { type });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
