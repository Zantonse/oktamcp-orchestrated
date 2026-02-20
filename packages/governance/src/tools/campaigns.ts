import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IgaClient } from "@okta-mcp/core";

export function registerCampaignTools(server: McpServer, client: IgaClient): void {
  server.tool(
    "okta_iga_list_campaigns",
    "List all access certification campaigns in the Okta IGA system. Use this to discover campaigns for review management. Filter by status to find active or scheduled campaigns. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      status: z
        .enum(["SCHEDULED", "ACTIVE", "COMPLETED", "OVERDUE", "ERROR"])
        .optional()
        .describe(
          "Filter campaigns by status: SCHEDULED (not yet launched), ACTIVE (in progress), COMPLETED (finished), OVERDUE (past deadline), ERROR (failed)"
        ),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of campaigns to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of results"),
    },
    async ({ status, limit, after }) => {
      const resp = await client.get("/campaigns", {
        params: { status, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_get_campaign",
    "Retrieve the full details of a specific access certification campaign by its ID. Use this to inspect campaign configuration, status, schedule, and reviewer assignments. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      campaignId: z
        .string()
        .describe("Okta campaign ID (e.g., obtained from okta_iga_list_campaigns)"),
    },
    async ({ campaignId }) => {
      const resp = await client.get(`/campaigns/${campaignId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_create_campaign",
    "Create a new access certification campaign to schedule periodic reviews of user access. Use this to set up campaigns that require reviewers to approve or revoke user access to resources. Campaigns start in SCHEDULED status and must be explicitly launched. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      name: z
        .string()
        .describe("Human-readable name for the campaign (e.g., 'Q1 2025 Engineering Access Review')"),
      description: z
        .string()
        .optional()
        .describe("Optional detailed description of the campaign's purpose and scope"),
      schedule: z
        .object({
          startDate: z
            .string()
            .describe("ISO 8601 date-time string for when the campaign should start (e.g., '2025-01-01T00:00:00Z')"),
          endDate: z
            .string()
            .describe("ISO 8601 date-time string for the campaign deadline (e.g., '2025-01-31T23:59:59Z')"),
        })
        .describe("Schedule configuration with start and end dates for the campaign window"),
      reviewerType: z
        .enum(["MANAGER", "APP_OWNER", "CUSTOM"])
        .describe(
          "Who reviews access: MANAGER (user's direct manager), APP_OWNER (application owner), CUSTOM (specific users or groups)"
        ),
      scope: z
        .object({
          resourceType: z
            .enum(["APP", "GROUP", "ENTITLEMENT"])
            .describe("Type of resource being reviewed: APP (application assignments), GROUP (group memberships), ENTITLEMENT (fine-grained permissions)"),
          resourceIds: z
            .array(z.string())
            .optional()
            .describe("Array of specific resource IDs to include in scope; omit to include all resources of the given type"),
        })
        .describe("Scope definition specifying which resources and access types are included in this campaign"),
    },
    async ({ name, description, schedule, reviewerType, scope }) => {
      const resp = await client.post("/campaigns", {
        name,
        description,
        schedule,
        reviewerType,
        scope,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_launch_campaign",
    "Launch a SCHEDULED certification campaign, making it ACTIVE. Once launched, reviewers will be notified and can begin reviewing access items. Can only be called on campaigns in SCHEDULED status. This action is not easily reversible — once active, the campaign is live and reviewers are notified. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      campaignId: z
        .string()
        .describe("Okta campaign ID of a SCHEDULED campaign to launch (obtained from okta_iga_list_campaigns or okta_iga_get_campaign)"),
    },
    async ({ campaignId }) => {
      const resp = await client.post(`/campaigns/${campaignId}/launch`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_close_campaign",
    "Close an ACTIVE or OVERDUE certification campaign, ending the review period. Any unreviewed items may be auto-decided based on campaign configuration. This action is irreversible — closed campaigns cannot be re-opened. Use with caution. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      campaignId: z
        .string()
        .describe("Okta campaign ID of an ACTIVE or OVERDUE campaign to close (obtained from okta_iga_list_campaigns or okta_iga_get_campaign)"),
    },
    async ({ campaignId }) => {
      const resp = await client.post(`/campaigns/${campaignId}/close`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_list_campaign_items",
    "List all review items within a specific certification campaign. Each item represents a user's access to a resource that requires a review decision. Use this to see pending, approved, and revoked items within a campaign. Supports pagination for large campaigns. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      campaignId: z
        .string()
        .describe("Okta campaign ID whose items to list (obtained from okta_iga_list_campaigns or okta_iga_get_campaign)"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of campaign items to return per page (default 50, max 200)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response to fetch the next page of items"),
    },
    async ({ campaignId, limit, after }) => {
      const resp = await client.get(`/campaigns/${campaignId}/items`, {
        params: { limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_iga_review_campaign_item",
    "Submit a review decision (APPROVED or REVOKED) for a certification campaign item. Justification is required for REVOKED decisions for audit compliance. Each item represents a user's access to a resource that needs periodic review. REVOKED decisions will trigger access removal workflows after campaign closure. Requires an Okta Identity Governance (IGA) add-on license.",
    {
      campaignId: z
        .string()
        .describe("Okta campaign ID containing the item to review"),
      itemId: z
        .string()
        .describe("Okta campaign item ID identifying the specific user-resource access record to review"),
      decision: z
        .enum(["APPROVED", "REVOKED"])
        .describe(
          "Review decision: APPROVED (user should retain access), REVOKED (user's access should be removed)"
        ),
      justification: z
        .string()
        .optional()
        .describe("Explanation for the review decision; required when decision is REVOKED for audit compliance and strongly recommended for APPROVED decisions"),
    },
    async ({ campaignId, itemId, decision, justification }) => {
      const resp = await client.post(`/campaigns/${campaignId}/items/${itemId}/review`, {
        decision,
        justification,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
