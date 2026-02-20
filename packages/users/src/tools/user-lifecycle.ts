import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerUserLifecycleTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_users",
    "List users in the Okta org with optional search, filter, and pagination. Use 'q' for simple name/email matching, 'search' for SCIM filter expressions, or 'filter' for Okta filter syntax (e.g. status eq \"ACTIVE\").",
    {
      q: z.string().optional().describe("Simple search string matched across firstName, lastName, and email"),
      search: z.string().optional().describe("SCIM filter expression, e.g. profile.department eq \"Engineering\""),
      filter: z.string().optional().describe("Okta filter expression, e.g. status eq \"ACTIVE\""),
      limit: z.number().min(1).max(200).optional().describe("Maximum number of results per page (default 50, max 200)"),
      after: z.string().optional().describe("Pagination cursor returned in the previous response to fetch the next page"),
    },
    async ({ q, search, filter, limit, after }) => {
      const resp = await client.get("/users", {
        params: { q, search, filter, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_user",
    "Retrieve a single Okta user by their ID, login (email), or the special value 'me' for the current token's user. Use this to look up profile details, status, and credentials for a specific user.",
    {
      userId: z.string().describe("Okta user ID (e.g. 00u1abcdef), login email, or 'me' for the token owner"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_user",
    "Create a new Okta user with a profile and optional credentials. Set activate=true to immediately activate the user and optionally send a welcome email; set activate=false (default) to create the user in STAGED status for later activation.",
    {
      profile: z.object({
        firstName: z.string().describe("User's first name"),
        lastName: z.string().describe("User's last name"),
        email: z.string().describe("User's primary email address"),
        login: z.string().describe("User's login (usually same as email)"),
        mobilePhone: z.string().optional().describe("User's mobile phone number"),
        secondEmail: z.string().optional().describe("User's secondary email address"),
        department: z.string().optional().describe("User's department"),
        title: z.string().optional().describe("User's job title"),
        organization: z.string().optional().describe("User's organization name"),
      }).describe("User profile attributes"),
      credentials: z.object({
        password: z.object({
          value: z.string().describe("Plain-text password to set on creation"),
        }).optional().describe("Password credential object"),
      }).optional().describe("Optional credentials to set at creation time"),
      activate: z.boolean().optional().describe("If true, activate the user immediately (default false, creates in STAGED status)"),
    },
    async ({ profile, credentials, activate }) => {
      const resp = await client.post(
        "/users",
        { profile, credentials },
        { params: { activate } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_user",
    "Update one or more profile attributes of an existing Okta user. Only the fields provided in the profile object are changed; all omitted fields remain unchanged. Use this for name changes, department updates, and other profile edits.",
    {
      userId: z.string().describe("Okta user ID (e.g. 00u1abcdef) or login email of the user to update"),
      profile: z.object({
        firstName: z.string().optional().describe("Updated first name"),
        lastName: z.string().optional().describe("Updated last name"),
        email: z.string().optional().describe("Updated primary email address"),
        login: z.string().optional().describe("Updated login (usually same as email)"),
        mobilePhone: z.string().optional().describe("Updated mobile phone number"),
        secondEmail: z.string().optional().describe("Updated secondary email address"),
        department: z.string().optional().describe("Updated department"),
        title: z.string().optional().describe("Updated job title"),
        organization: z.string().optional().describe("Updated organization name"),
        displayName: z.string().optional().describe("Updated display name"),
        nickName: z.string().optional().describe("Updated nickname"),
        userType: z.string().optional().describe("Updated user type"),
        employeeNumber: z.string().optional().describe("Updated employee number"),
        costCenter: z.string().optional().describe("Updated cost center"),
        division: z.string().optional().describe("Updated division"),
        manager: z.string().optional().describe("Updated manager name"),
        managerId: z.string().optional().describe("Updated manager ID"),
      }).describe("Partial profile object — only specified fields are updated"),
    },
    async ({ userId, profile }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}`, { profile });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_deactivate_user",
    "Deactivate a user, changing their status to DEPROVISIONED and revoking all active sessions and application assignments. Use this before okta_delete_user — a user must be DEPROVISIONED before they can be permanently deleted. Optionally send a deactivation notification email.",
    {
      userId: z.string().describe("Okta user ID or login email of the user to deactivate"),
      sendEmail: z.boolean().optional().describe("If true, send a deactivation notification email to the user (default false)"),
    },
    async ({ userId, sendEmail }) => {
      const resp = await client.post(
        `/users/${encodeURIComponent(userId)}/lifecycle/deactivate`,
        undefined,
        { params: { sendEmail } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_activate_user",
    "Activate a user in STAGED or PROVISIONED status, transitioning them to ACTIVE. Optionally send an activation email with a one-time token link; if sendEmail is false, the activation token is returned in the response for use in custom flows.",
    {
      userId: z.string().describe("Okta user ID or login email of the user to activate"),
      sendEmail: z.boolean().optional().describe("If true, send an activation email to the user; if false, return the activation token in the response (default true)"),
    },
    async ({ userId, sendEmail }) => {
      const resp = await client.post(
        `/users/${encodeURIComponent(userId)}/lifecycle/activate`,
        undefined,
        { params: { sendEmail } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_suspend_user",
    "Temporarily suspend an ACTIVE user without deprovisioning them. Unlike deactivation, suspended users retain their app assignments and group memberships. Use okta_unsuspend_user to restore access.",
    {
      userId: z.string().describe("Okta user ID or login email of the user to suspend"),
    },
    async ({ userId }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}/lifecycle/suspend`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_unsuspend_user",
    "Restore a SUSPENDED user back to ACTIVE status. Use this to re-enable access for a user that was previously suspended with okta_suspend_user.",
    {
      userId: z.string().describe("Okta user ID or login email of the suspended user to unsuspend"),
    },
    async ({ userId }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}/lifecycle/unsuspend`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_unlock_user",
    "Unlock a user whose account has been locked out due to too many failed login attempts. This restores their ability to authenticate without changing their password or status.",
    {
      userId: z.string().describe("Okta user ID or login email of the locked user to unlock"),
    },
    async ({ userId }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}/lifecycle/unlock`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_expire_password",
    "Expire a user's current password, forcing them to set a new password on their next login. Use this for security policy enforcement or when a password reset is needed without invalidating the current session immediately.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose password should be expired"),
    },
    async ({ userId }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}/lifecycle/expire_password`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_reset_password",
    "Initiate a password reset for a user. If sendEmail is true, Okta sends a password reset email to the user; if false, a reset token URL is returned in the response for custom reset flows.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose password should be reset"),
      sendEmail: z.boolean().optional().describe("If true, send a password reset email to the user; if false, return the reset token URL in the response (default true)"),
    },
    async ({ userId, sendEmail }) => {
      const resp = await client.post(
        `/users/${encodeURIComponent(userId)}/lifecycle/reset_password`,
        undefined,
        { params: { sendEmail } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_set_password",
    "Directly set a new plain-text password for a user without requiring the user to go through a reset flow. Use this for admin-initiated password changes or provisioning scripts. The user will be required to change the password on next login if the policy requires it.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose password should be set"),
      newPassword: z.string().describe("The new plain-text password to set for the user"),
    },
    async ({ userId, newPassword }) => {
      const resp = await client.put(`/users/${encodeURIComponent(userId)}`, {
        credentials: {
          password: { value: newPassword },
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_user",
    "Permanently delete a deprovisioned user and all associated data. The user MUST be in DEPROVISIONED status first — call okta_deactivate_user before this. This operation is irreversible and cannot be undone.",
    {
      userId: z.string().describe("Okta user ID or login email of the DEPROVISIONED user to permanently delete"),
    },
    async ({ userId }) => {
      const resp = await client.delete(`/users/${encodeURIComponent(userId)}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data ?? { success: true }, null, 2) }],
      };
    }
  );
}
