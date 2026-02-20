import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerAppCredentialTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_app_keys",
    "List all signing key credentials for an application. Returns all active and inactive certificate keys used for signing SAML assertions or JWT tokens. Use this to inspect current certificates, check expiry dates, or verify the active key.",
    {
      appId: z.string().describe("Okta application ID whose signing keys to list"),
    },
    async ({ appId }) => {
      const resp = await client.get(`/apps/${appId}/credentials/keys`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_generate_app_key",
    "Generate a new signing key credential for an application. For SAML apps, this rotates the signing certificate. WARNING: rotating keys may break existing SSO integrations until the new certificate is shared with the service provider. After generating, update the SP with the new certificate before activating.",
    {
      appId: z.string().describe("Okta application ID for which to generate a new signing key"),
      validityYears: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe(
          "Number of years the generated certificate will remain valid (default 1, max 10). Choose a value that matches your certificate rotation policy."
        ),
    },
    async ({ appId, validityYears }) => {
      const resp = await client.post(
        `/apps/${appId}/credentials/keys/generate`,
        undefined,
        { params: { validityYears } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_app_metadata",
    "Retrieve the SAML metadata for an application. Returns the SAML 2.0 metadata XML document URL that can be shared with a service provider to configure SSO. Only applicable to SAML_2_0 applications.",
    {
      appId: z.string().describe("Okta application ID of the SAML 2.0 application whose metadata to retrieve"),
    },
    async ({ appId }) => {
      const resp = await client.get(`/apps/${appId}/sso/saml/metadata`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
