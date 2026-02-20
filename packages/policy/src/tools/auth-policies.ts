import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerAuthPolicyTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_auth_server_policies",
    "List all access policies for a custom authorization server. Policies determine which clients can request tokens and which rules apply. Policies are evaluated in priority order — lower priority numbers are evaluated first.",
    {
      authServerId: z.string().describe("Okta authorization server ID whose policies will be listed"),
    },
    async ({ authServerId }) => {
      const resp = await client.get(`/authorizationServers/${authServerId}/policies`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_auth_server_policy",
    "Create an access policy for an authorization server. Policies control which clients can request tokens and under what conditions. Priority determines evaluation order — lower numbers are evaluated first. Use conditions.clients.include to restrict the policy to specific OAuth2 client IDs.",
    {
      authServerId: z.string().describe("Okta authorization server ID to add the policy to"),
      name: z.string().describe("Human-readable name for the access policy"),
      description: z.string().describe("Description of what this policy governs"),
      priority: z.number().int().min(1).describe(
        "Evaluation priority — lower numbers are evaluated first. A policy with priority 1 is evaluated before priority 2."
      ),
      clientIds: z.array(z.string()).describe(
        "Array of OAuth2 client IDs this policy applies to. Use [\"ALL_CLIENTS\"] to apply to all clients."
      ),
    },
    async ({ authServerId, name, description, priority, clientIds }) => {
      const body = {
        name,
        description,
        priority,
        type: "OAUTH_AUTHORIZATION_POLICY",
        conditions: {
          clients: {
            include: clientIds,
          },
        },
      };
      const resp = await client.post(`/authorizationServers/${authServerId}/policies`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_update_auth_server_policy",
    "Update an existing access policy on a custom authorization server. Only the provided fields will be changed. Use this to rename the policy, update its description, or reprioritize it relative to other policies.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the policy"),
      policyId: z.string().describe("Okta policy ID to update"),
      name: z.string().optional().describe("New name for the policy"),
      description: z.string().optional().describe("New description for the policy"),
      priority: z.number().int().min(1).optional().describe(
        "New evaluation priority — lower numbers are evaluated first"
      ),
    },
    async ({ authServerId, policyId, name, description, priority }) => {
      // Fetch current to merge
      const current = await client.get<Record<string, unknown>>(
        `/authorizationServers/${authServerId}/policies/${policyId}`
      );
      const currentData = current.data as Record<string, unknown>;
      const body: Record<string, unknown> = {
        name: name ?? currentData.name,
        description: description ?? currentData.description,
        priority: priority ?? currentData.priority,
        type: currentData.type,
        conditions: currentData.conditions,
      };
      const resp = await client.put(
        `/authorizationServers/${authServerId}/policies/${policyId}`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_auth_server_policy",
    "Delete an access policy from a custom authorization server. All rules within the policy are also deleted. This action is irreversible. Ensure no active clients depend on this policy before deleting.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the policy"),
      policyId: z.string().describe("Okta policy ID to delete"),
    },
    async ({ authServerId, policyId }) => {
      await client.delete(`/authorizationServers/${authServerId}/policies/${policyId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, authServerId, policyId }, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_list_policy_rules",
    "List all rules within an authorization server policy. Rules define token lifetimes, allowed grant types, and conditions. Rules are evaluated in priority order — lower priority numbers are checked first.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the policy"),
      policyId: z.string().describe("Okta policy ID whose rules will be listed"),
    },
    async ({ authServerId, policyId }) => {
      const resp = await client.get(
        `/authorizationServers/${authServerId}/policies/${policyId}/rules`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_create_policy_rule",
    "Create a rule within an authorization server policy. Rules define token lifetime, scopes, and conditions (grant types, people, scopes). Priority ordering within the policy determines which rule matches first — lower priority numbers are evaluated first. A rule with no conditions acts as a catch-all.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the policy"),
      policyId: z.string().describe("Okta policy ID to add the rule to"),
      name: z.string().describe("Human-readable name for the rule"),
      priority: z.number().int().min(1).describe(
        "Evaluation priority within the policy — lower numbers are evaluated first"
      ),
      conditions: z.record(z.unknown()).describe(
        "Conditions object that controls when this rule applies. Can include grantTypes (e.g. { grantTypes: { include: [\"authorization_code\"] } }), people, scopes, and more."
      ),
      actions: z.record(z.unknown()).describe(
        "Actions object defining token behavior. Includes token lifetimes (e.g. { token: { accessTokenLifetimeMinutes: 60, refreshTokenLifetimeMinutes: 0, refreshTokenWindowMinutes: 10080 } })"
      ),
    },
    async ({ authServerId, policyId, name, priority, conditions, actions }) => {
      const body = {
        name,
        priority,
        type: "RESOURCE_ACCESS",
        conditions,
        actions,
      };
      const resp = await client.post(
        `/authorizationServers/${authServerId}/policies/${policyId}/rules`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_delete_policy_rule",
    "Delete a rule from an authorization server policy. Tokens already issued under this rule remain valid until they expire. This action is irreversible.",
    {
      authServerId: z.string().describe("Okta authorization server ID that owns the policy"),
      policyId: z.string().describe("Okta policy ID that contains the rule"),
      ruleId: z.string().describe("Okta rule ID to delete"),
    },
    async ({ authServerId, policyId, ruleId }) => {
      await client.delete(
        `/authorizationServers/${authServerId}/policies/${policyId}/rules/${ruleId}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, authServerId, policyId, ruleId }, null, 2) }],
      };
    }
  );
}
