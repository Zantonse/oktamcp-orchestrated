import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IgaClient } from "@okta-mcp/core";

export function registerAccessRequestTools(server: McpServer, client: IgaClient): void {
  server.tool(
    "okta_iga_list_access_requests",
    "List self-service access requests in the Okta IGA system. Use this to view pending requests awaiting approval, or to audit historical request decisions. Filter by status to find actionable requests or by requesterId to see a specific user's requests. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      status: z
        .enum(["PENDING", "APPROVED", "DENIED", "CANCELLED"])
        .optional()
        .describe(
          "Filter requests by status: PENDING (awaiting approval), APPROVED (access granted), DENIED (rejected), CANCELLED (withdrawn by requester)"
        ),
      requesterId: z
        .string()
        .optional()
        .describe("Filter requests by the Okta user ID of the person who submitted the request"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of access requests to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of results"),
    },
    async ({ status, requesterId, limit, after }) => {
      const resp = await client.get("/requests", {
        params: { status, requesterId, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_create_access_request",
    "Create a self-service access request on behalf of a user. The request enters an approval workflow. Justification is required to explain why the access is needed. Use this to initiate governed access provisioning rather than directly assigning access, which preserves the audit trail and enforces approval policies. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      requesterId: z
        .string()
        .describe("Okta user ID of the person requesting access (the user who needs the access, e.g., '00u1abc123XYZ')"),
      resourceId: z
        .string()
        .describe("Okta resource ID being requested (e.g., an application ID, group ID, or entitlement ID)"),
      resourceType: z
        .enum(["APP", "GROUP", "ENTITLEMENT", "BUNDLE"])
        .describe(
          "Type of resource being requested: APP (application access), GROUP (group membership), ENTITLEMENT (fine-grained permission), BUNDLE (set of entitlements)"
        ),
      justification: z
        .string()
        .describe("Business justification for why the requester needs this access; required for audit compliance and approval workflow context"),
    },
    async ({ requesterId, resourceId, resourceType, justification }) => {
      const resp = await client.post("/requests", {
        requesterId,
        resourceId,
        resourceType,
        justification,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_approve_access_request",
    "Approve a PENDING access request, granting the requester the specified access. Approval triggers the provisioning workflow to assign the requested resource. Use okta_iga_list_access_requests to find pending requests that need approval. This action is recorded in the audit trail. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      requestId: z
        .string()
        .describe("Okta access request ID to approve (e.g., obtained from okta_iga_list_access_requests with status PENDING)"),
      approverNote: z
        .string()
        .optional()
        .describe("Optional note from the approver explaining the approval decision, recorded in the audit trail"),
    },
    async ({ requestId, approverNote }) => {
      const resp = await client.post(`/requests/${requestId}/approve`, {
        approverNote,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_deny_access_request",
    "Deny a pending access request. A reason must be provided for the denial, which is recorded in the audit trail. The requester will be notified of the denial. Use this when the requested access violates policy or cannot be justified. Use okta_iga_list_access_requests to find requests with status PENDING. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      requestId: z
        .string()
        .describe("Okta access request ID to deny (e.g., obtained from okta_iga_list_access_requests with status PENDING)"),
      reason: z
        .string()
        .describe("Required explanation for why the access request is being denied; communicated to the requester and recorded in the audit trail"),
    },
    async ({ requestId, reason }) => {
      const resp = await client.post(`/requests/${requestId}/deny`, {
        reason,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_revoke_access_request",
    "Cancel an in-flight access request, withdrawing it from the approval workflow. Use this to cancel a PENDING request that was submitted in error or is no longer needed. Once cancelled, the request cannot be resubmitted without creating a new request. Use okta_iga_list_access_requests to find the request ID. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      requestId: z
        .string()
        .describe("Okta access request ID to cancel (e.g., obtained from okta_iga_list_access_requests with status PENDING)"),
    },
    async ({ requestId }) => {
      const resp = await client.post(`/requests/${requestId}/cancel`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
