import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

const factorTypeEnum = z.enum([
  "token:software:totp",
  "push",
  "webauthn",
  "email",
  "sms",
  "call",
  "token",
  "token:hardware",
  "question",
  "token:hotp",
  "signed_nonce",
]);

export function registerFactorTools(server: McpServer, client: OktaClient): void {
  server.tool(
    "okta_list_user_factors",
    "List all enrolled MFA factors for a user. Use this to audit a user's enrolled authenticators, check factor status, or determine what factors are available before resetting or verifying.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose enrolled factors to list"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/factors`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_get_factor",
    "Retrieve details of a specific enrolled MFA factor for a user. Use this to check the status, type, and configuration of a single factor when you already know the factor ID.",
    {
      userId: z.string().describe("Okta user ID or login email of the user who owns the factor"),
      factorId: z.string().describe("Okta factor ID of the specific factor to retrieve"),
    },
    async ({ userId, factorId }) => {
      const resp = await client.get(
        `/users/${encodeURIComponent(userId)}/factors/${encodeURIComponent(factorId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_enroll_factor",
    "Enroll a new MFA factor for a user. After enrollment, most factors require activation (e.g. via a passcode) — use okta_activate_factor to complete the enrollment. Use okta_list_supported_factors to see which factors are available for the user.",
    {
      userId: z.string().describe("Okta user ID or login email of the user to enroll a factor for"),
      factorType: factorTypeEnum.describe("Type of factor to enroll, e.g. 'token:software:totp' for TOTP, 'sms' for SMS, 'push' for Okta Verify push"),
      provider: z.string().describe("Factor provider, e.g. 'GOOGLE' for Google Authenticator, 'OKTA' for Okta Verify, 'YUBICO' for YubiKey"),
      profile: z.object({
        phoneNumber: z.string().optional().describe("Phone number for SMS or call factors (E.164 format, e.g. +15551234567)"),
        credentialId: z.string().optional().describe("Credential ID for hardware token factors"),
      }).optional().describe("Optional factor-specific profile attributes (required for SMS/call factors)"),
    },
    async ({ userId, factorType, provider, profile }) => {
      const resp = await client.post(`/users/${encodeURIComponent(userId)}/factors`, {
        factorType,
        provider,
        profile,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_activate_factor",
    "Activate a newly enrolled MFA factor by providing the verification passcode. This completes the enrollment process for factors like TOTP (provide the 6-digit code), SMS, or email. Call this after okta_enroll_factor when the factor status is PENDING_ACTIVATION.",
    {
      userId: z.string().describe("Okta user ID or login email of the user who owns the factor"),
      factorId: z.string().describe("Okta factor ID of the factor to activate (must be in PENDING_ACTIVATION status)"),
      passCode: z.string().optional().describe("One-time passcode or verification code to confirm ownership of the factor (required for most factor types)"),
    },
    async ({ userId, factorId, passCode }) => {
      const body = passCode !== undefined ? { passCode } : undefined;
      const resp = await client.post(
        `/users/${encodeURIComponent(userId)}/factors/${encodeURIComponent(factorId)}/lifecycle/activate`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_reset_factor",
    "Unenroll (delete) a specific MFA factor from a user, removing it from their account. Use this when a user loses a device, wants to re-enroll a factor, or for security remediation. After reset, the user must re-enroll the factor using okta_enroll_factor.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose factor should be unenrolled"),
      factorId: z.string().describe("Okta factor ID of the factor to unenroll and delete"),
    },
    async ({ userId, factorId }) => {
      const resp = await client.delete(
        `/users/${encodeURIComponent(userId)}/factors/${encodeURIComponent(factorId)}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data ?? { success: true }, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_verify_factor",
    "Verify a user's MFA factor by submitting a passcode or triggering a push notification. Use this for step-up authentication checks or to test that a factor is working correctly before relying on it for authentication.",
    {
      userId: z.string().describe("Okta user ID or login email of the user whose factor to verify"),
      factorId: z.string().describe("Okta factor ID of the factor to verify"),
      passCode: z.string().optional().describe("One-time passcode from the user's authenticator app, SMS, or email (not required for push factors)"),
    },
    async ({ userId, factorId, passCode }) => {
      const body = passCode !== undefined ? { passCode } : undefined;
      const resp = await client.post(
        `/users/${encodeURIComponent(userId)}/factors/${encodeURIComponent(factorId)}/verify`,
        body
      );
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "okta_list_supported_factors",
    "List all MFA factors that are available for enrollment for a specific user based on the org's factor policies. Use this before okta_enroll_factor to determine which factorType and provider values are valid for the user.",
    {
      userId: z.string().describe("Okta user ID or login email of the user to check supported factors for"),
    },
    async ({ userId }) => {
      const resp = await client.get(`/users/${encodeURIComponent(userId)}/factors/catalog`);
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
