/**
 * Okta API error parsing and human-readable error code mapping.
 *
 * Reference: https://developer.okta.com/docs/reference/error-codes/
 */

export interface OktaErrorCause {
  errorSummary: string;
}

export interface OktaErrorBody {
  errorCode: string;
  errorSummary: string;
  errorLink: string;
  errorId: string;
  errorCauses: OktaErrorCause[];
}

export class OktaApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly errorSummary: string;
  readonly errorId: string;
  readonly errorCauses: OktaErrorCause[];
  readonly friendlyMessage: string;

  constructor(status: number, body: OktaErrorBody) {
    const friendly = OKTA_ERROR_CODES[body.errorCode];
    const message = friendly
      ? `${body.errorCode}: ${friendly} — ${body.errorSummary}`
      : `${body.errorCode}: ${body.errorSummary}`;

    super(message);
    this.name = "OktaApiError";
    this.status = status;
    this.errorCode = body.errorCode;
    this.errorSummary = body.errorSummary;
    this.errorId = body.errorId;
    this.errorCauses = body.errorCauses ?? [];
    this.friendlyMessage = friendly ?? body.errorSummary;
  }
}

/**
 * Attempts to parse an Okta error response body from an unknown value.
 * Returns undefined if the value doesn't match the expected shape.
 */
export function parseOktaErrorBody(data: unknown): OktaErrorBody | undefined {
  if (
    typeof data !== "object" ||
    data === null ||
    !("errorCode" in data) ||
    !("errorSummary" in data)
  ) {
    return undefined;
  }
  const obj = data as Record<string, unknown>;
  return {
    errorCode: String(obj.errorCode),
    errorSummary: String(obj.errorSummary),
    errorLink: String(obj.errorLink ?? ""),
    errorId: String(obj.errorId ?? ""),
    errorCauses: Array.isArray(obj.errorCauses)
      ? obj.errorCauses.map((c: unknown) => ({
          errorSummary: String(
            (c as Record<string, unknown>)?.errorSummary ?? ""
          ),
        }))
      : [],
  };
}

/**
 * Complete mapping of Okta error codes to human-readable descriptions.
 * Source: https://developer.okta.com/docs/reference/error-codes/
 */
export const OKTA_ERROR_CODES: Record<string, string> = {
  E0000001: "API validation failed",
  E0000002: "Illegal API argument",
  E0000003: "Request body was not well-formed",
  E0000004: "Authentication failed",
  E0000005: "Invalid session",
  E0000006: "Access denied",
  E0000007: "Resource not found",
  E0000008: "Requested path not found",
  E0000009: "Internal server error",
  E0000010: "Service is in read-only mode",
  E0000011: "Invalid token provided",
  E0000012: "Unsupported media type",
  E0000013: "Invalid client app ID",
  E0000014: "Update of credentials failed",
  E0000015: "Feature not enabled — you do not have permission",
  E0000016: "Activation failed — user is already active",
  E0000017: "Password reset failed",
  E0000018: "Bad request — Accept/Content-Type headers likely not set",
  E0000019: "Bad request — Accept/Content-Type headers do not match supported values",
  E0000020: "Bad request",
  E0000021: "Bad request — unsupported Content-Type",
  E0000022: "HTTP method not supported for this endpoint",
  E0000023: "Operation failed — user profile is mastered under another system",
  E0000024: "Unsupported app metadata operation",
  E0000025: "App version assignment failed",
  E0000026: "API endpoint deprecated",
  E0000027: "Group push bad request",
  E0000028: "Missing required request parameter",
  E0000029: "Invalid paging request",
  E0000030: "Invalid date format — use yyyy-MM-dd'T'HH:mm:ss.SSSZZ",
  E0000031: "Invalid search criteria",
  E0000032: "Unlock not allowed for this user",
  E0000033: "Cannot specify search query and filter in the same request",
  E0000034: "Forgot password not allowed for this user",
  E0000035: "Change password not allowed for this user",
  E0000036: "Change recovery question not allowed for this user",
  E0000037: "Type mismatch",
  E0000038: "Operation not allowed in the user's current status",
  E0000039: "Operation on application settings failed",
  E0000040: "Application label must be unique",
  E0000041: "Credentials should not be set based on the scheme",
  E0000042: "Setting error page redirect URL failed",
  E0000043: "Self-service application assignment not enabled",
  E0000044: "Self-service application assignment not supported",
  E0000045: "Field mapping bad request",
  E0000046: "Deactivate application for user forbidden",
  E0000047: "API rate limit exceeded",
  E0000048: "Entity not found",
  E0000049: "Invalid SCIM data from SCIM implementation",
  E0000050: "Invalid SCIM data from client",
  E0000051: "No response from SCIM implementation",
  E0000052: "Endpoint not implemented",
  E0000053: "Invalid SCIM filter",
  E0000054: "Invalid pagination properties",
  E0000055: "Duplicate group",
  E0000056: "Delete application forbidden",
  E0000057: "Access denied due to policy",
  E0000058: "Access requires MFA",
  E0000059: "Connector configuration test failure",
  E0000060: "Unsupported operation",
  E0000061: "Tab error",
  E0000062: "User already assigned to application",
  E0000063: "Invalid combination of parameters",
  E0000064: "Password expired — must be changed",
  E0000065: "Internal error processing app metadata",
  E0000066: "APNS not configured",
  E0000067: "Factor service timeout",
  E0000068: "Invalid passcode/answer",
  E0000069: "User locked",
  E0000070: "Waiting for factor acknowledgement",
  E0000071: "Unsupported OS version",
  E0000072: "MIM policy disallowed enrollment",
  E0000073: "User rejected authentication",
  E0000074: "Factor service error",
  E0000075: "Cannot modify attribute — field mapping with profile push enabled",
  E0000076: "Cannot modify app user — mastered by external app",
  E0000077: "Cannot modify read-only attribute",
  E0000078: "Cannot modify immutable attribute",
  E0000079: "Operation not allowed in current authentication state",
  E0000080: "Password does not meet complexity requirements",
  E0000081: "Cannot modify reserved attribute for this application",
  E0000082: "Passcode already used — wait for new code",
  E0000083: "Passcode valid but exceeded time window",
  E0000084: "App evaluation error",
  E0000085: "Sign-on denied — no permission to access account",
  E0000086: "Policy cannot be activated at this time",
  E0000087: "Recovery question answer did not match",
  E0000088: "Org subdomain already exists",
  E0000089: "Org name validation failed",
  E0000090: "Role already assigned to user",
  E0000091: "Provided role type does not match required role type",
  E0000092: "Access requires re-authentication",
  E0000093: "Target count limit exceeded",
  E0000094: "Unsupported filter",
  E0000095: "Recovery not allowed for unknown user",
  E0000096: "Certificate already uploaded",
  E0000097: "No verified phone number on file",
  E0000098: "Invalid phone number",
  E0000099: "Only US and Canada numbers allowed",
  E0000100: "Unable to perform search query",
  E0000101: "Issue with app binary file",
  E0000102: "YubiKey cannot be deleted while assigned — deactivate first",
  E0000103: "Device action already queued or in progress",
  E0000104: "Device already locked",
  E0000105: "Recovery link expired or previously used",
  E0000107: "Entity not in expected state for transition",
  E0000108: "Duplicate resource",
  E0000109: "SMS recently sent — wait 30 seconds",
  E0000110: "Link expired or previously used",
  E0000111: "Cannot modify read-only object",
  E0000112: "Cannot update user — still being activated",
  E0000113: "Factor additional challenge required",
  E0000115: "Issue uploading app binary file",
  E0000116: "Hosted mobile app upload error",
  E0000117: "Cannot assign apps to inactive user",
  E0000118: "Email recently sent — wait 5 seconds",
  E0000119: "Account locked — contact administrator",
  E0000120: "Custom domain already in use by another org",
  E0000121: "Invalid phone extension",
  E0000122: "Accept header must contain application/json",
  E0000123: "Enum/oneOf const values mismatch",
  E0000124: "Expire-on-create requires a password",
  E0000125: "Expire-on-create requires activate=true",
  E0000126: "Self-service not supported with current settings",
  E0000127: "Invalid linked object definition",
  E0000131: "Feature validation error",
  E0000132: "Registration already active for user/client/device combo",
  E0000133: "Phone call recently made — wait 30 seconds",
  E0000134: "Could not communicate with inline hook",
  E0000135: "Inline hook responded with error",
  E0000136: "Mobile phone conflict",
  E0000137: "No response from inline hook (timeout)",
  E0000138: "Internal error with telephony provider(s)",
  E0000139: "Telephony provider error",
  E0000140: "Telephony opt-out error",
  E0000141: "Feature cannot be enabled/disabled due to dependency conflicts",
  E0000142: "User type cannot be deleted",
  E0000143: "App instance operation not allowed",
  E0000145: "User data inconsistent with schema — cannot parse",
  E0000146: "Organization SMS limit reached for 24-hour period",
  E0000147: "Organization call limit reached for 24-hour period",
  E0000148: "Cannot modify/disable authenticator — enabled in policies",
  E0000149: "HTTP request not acceptable",
  E0000150: "SMS rate limit reached",
  E0000151: "Call rate limit reached",
  E0000152: "Illegal device status — cannot perform action",
  E0000153: "Invalid device ID — no longer exists",
  E0000154: "Invalid factor ID — not currently active",
  E0000155: "User not currently active",
  E0000156: "Invalid user ID — user does not exist or was deleted",
  E0000157: "Authenticator already active with this key",
  E0000158: "Invalid enrollment — user verification required",
  E0000159: "Invalid enrollment — FIPS compliance required",
  E0000161: "Domain name must be unique",
  E0000162: "Domain count limit reached",
  E0000163: "Domain ID not found",
  E0000165: "Domain not verified",
  E0000166: "CAPTCHA limit reached — one per org",
  E0000167: "Cannot deactivate IdP used by authenticator",
  E0000168: "CAPTCHA associated with org — unassociate before removing",
  E0000170: "Org subdomain is reserved",
  E0000171: "Org subdomain locked by another request",
  E0000172: "Org subdomain exceeds max length",
  E0000174: "Cannot disable FastPass — used by sign-on policies",
  E0000176: "Failed to create log streaming event source",
  E0000177: "Failed to delete log streaming event source",
  E0000178: "Realm cannot be deleted",
  E0000179: "Required attribute is externally sourced",
  E0000180: "Factor currently suspended",
  E0000181: "DNS challenge not found — service temporarily unavailable",
  E0000182: "Default email template customization already exists",
  E0000183: "Email customization for that language already exists",
  E0000184: "Default email customization cannot be deleted",
  E0000185: "Default email customization isDefault cannot be set to false",
  E0000186: "Free tier SMS limit reached for 30-day period",
  E0000187: "Cannot delete push provider — used by custom authenticator",
  E0000188: "Domain update conflict",
  E0000189: "Template does not support the recipients value",
  E0000190: "Delete LDAP interface instance forbidden",
  E0000191: "Verification timed out",
  E0000192: "Roles cannot be granted to groups with membership rules",
  E0000193: "Roles can only be granted to groups with 5000 or fewer users",
  E0000194: "Roles can only be granted to Okta, AD, or LDAP groups",
  E0000195: "API validation failed due to conflict",
  E0000197: "Email domain name must be unique",
  E0000198: "Email domain not found",
  E0000200: "Default brand cannot be deleted",
  E0000201: "Brand associated with domain cannot be deleted",
  E0000202: "Brand name already exists",
  E0000203: "Failed to associate domain with brand",
  E0000204: "SMS rate limit reached",
  E0000205: "Call rate limit reached",
  E0000207: "Incorrect username or password",
  E0000208: "Failed to get access token — invalid request",
  E0000209: "AAGUID group used in enroll policy — update policy first",
  E0000211: "Roles cannot be granted to built-in groups",
  E0000212: "Origin validation failed",
  E0000213: "Cannot update page content for the default brand",
  E0000214: "User has no CIBA-enabled authenticator enrollments",
  E0000215: "API endpoint no longer available",
  E0000217: "Invalid status — cannot validate email domain",
  E0000218: "Email domain could not be verified by mail provider",
  E0000219: "Cannot result in 0 phishing-resistant authenticators",
  E0000220: "Brand count limit reached",
  E0000221: "Realm limit exceeded",
  E0000222: "Only one SMTP server can be enabled at a time",
  E0000223: "Connection with SMTP server failed",
  E0000224: "Authentication with SMTP server failed",
  E0000225: "Maximum enrolled SMTP servers reached",
  E0000226: "Active telephony inline hook required for Phone authenticator",
  E0000227: "Roles can only be granted to service application type",
  E0000228: "SMS template customization not permitted",
  E0000229: "Invalid enrollment — biometrics with PIN fallback required",
  E0000230: "Another authenticator already associated with this IdP",
  E0000231: "ETag value does not match",
  E0000232: "Authenticator enrollment with same nickname already exists",
  E0000233: "Okta Verify SMS setup link requires paid account",
  E0000235: "Resource selector error",
  E0000236: "Email language does not conform to BCP 47 standard",
  E0000237: "Language not permitted for email customization",
  E0000239: "Policy priorities being reconciled — try again later",
  E0000240: "Request timed out waiting for agent",
  E0000241: "No connected agents",
  E0000242: "ETag syntax is invalid",
  E0000243: "Bad request",
  E0000244: "Conflicting default email customizations — reset templates",
  E0000245: "Knowledge method in first auth step — requires possession factor first",
  E0000246: "Cannot deactivate auth method — in use by authentication policies",
  E0000247: "Organization does not support SMS or Voice authentication",
  E0000248: "IdP used by Okta Account Management Policy rules",
  E0000249: "Group rules still being set up — try again later",
  E0000250: "IdP Trust claims dependency — update policies first",
  E0000251: "IdP Trust claims dependency in GSP policy",
  E0000252: "IdP Trust claims dependency in ASOP policy",
  E0000253: "User type still being initialized",
  E0000254: "Email template settings update conflict",
  E0000255: "Cannot delete app with Published version status",
  E0000256: "Response header too large",
  E0000257: "Cannot update content for the default brand",
  E0000258: "Unsupported well-known URI path",
  E0000259: "Login not allowed — breached credential, password must be reset",
  E0000260: "Developer org has been deactivated",
  E0000261: "Invalid linked object value for this user",
  E0000262: "Device Posture IdP conditions — update policies first",
  E0000263: "Duplicate standard IAM role assignment",
  E0000264: "Active telephony hook or provider required for Phone authenticator",
  E0000265: "Device registration already in progress",
  E0000266: "Failed to get access token for SMTP server",
};
