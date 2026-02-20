/* ──────────────────────────────────────────────────────────────
 * Shared TypeScript interfaces for the Okta MCP system.
 * These are intentionally loose (index signatures) because the
 * Okta API returns many optional/version-dependent fields.
 * ────────────────────────────────────────────────────────────── */

/** Core user object returned by /api/v1/users */
export interface OktaUser {
  id: string;
  status: string;
  created: string;
  activated: string | null;
  statusChanged: string | null;
  lastLogin: string | null;
  lastUpdated: string;
  passwordChanged: string | null;
  type: { id: string };
  profile: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Group object returned by /api/v1/groups */
export interface OktaGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  type: string;
  profile: {
    name: string;
    description?: string;
    [key: string]: unknown;
  };
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Application object returned by /api/v1/apps */
export interface OktaApp {
  id: string;
  name: string;
  label: string;
  status: string;
  created: string;
  lastUpdated: string;
  signOnMode: string;
  features?: string[];
  visibility?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Policy object returned by /api/v1/policies */
export interface OktaPolicy {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  priority: number;
  system: boolean;
  created: string;
  lastUpdated: string;
  conditions?: Record<string, unknown>;
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Standard Okta error response shape */
export interface OktaErrorResponse {
  errorCode: string;
  errorSummary: string;
  errorLink: string;
  errorId: string;
  errorCauses: Array<{ errorSummary: string }>;
}

/** Wrapper for paginated list responses */
export interface OktaListResponse<T> {
  items: T[];
  nextCursor?: string;
}

/* ── IGA (Identity Governance & Administration) ────────────── */

export interface IgaEntitlement {
  id: string;
  name: string;
  description?: string;
  resourceType?: string;
  app?: { id: string; label?: string };
  [key: string]: unknown;
}

export interface IgaCampaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  created?: string;
  lastUpdated?: string;
  schedule?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IgaBundle {
  id: string;
  name: string;
  description?: string;
  status?: string;
  entitlements?: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface IgaAccessRequest {
  id: string;
  requestType: string;
  status: string;
  created?: string;
  requester?: { id: string; [key: string]: unknown };
  requestedFor?: { id: string; [key: string]: unknown };
  requestedItems?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/* ── Authorization Server / OAuth ──────────────────────────── */

export interface AuthServer {
  id: string;
  name: string;
  description?: string;
  audiences: string[];
  issuer: string;
  issuerMode?: string;
  status: string;
  created: string;
  lastUpdated: string;
  credentials?: Record<string, unknown>;
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OAuthScope {
  id: string;
  name: string;
  description?: string;
  consent?: string;
  default?: boolean;
  system?: boolean;
  metadataPublish?: string;
  [key: string]: unknown;
}

export interface OAuthClaim {
  id: string;
  name: string;
  status: string;
  claimType: string;
  valueType: string;
  value?: string;
  conditions?: Record<string, unknown>;
  alwaysIncludeInToken?: boolean;
  system?: boolean;
  [key: string]: unknown;
}

/* ── Devices & Hooks ───────────────────────────────────────── */

export interface OktaDevice {
  id: string;
  status: string;
  created: string;
  lastUpdated: string;
  profile?: Record<string, unknown>;
  resourceType?: string;
  resourceDisplayName?: Record<string, unknown>;
  resourceAlternateId?: string;
  _links?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OktaEventHook {
  id: string;
  name: string;
  status: string;
  events: { type: string; items: string[] };
  channel: {
    type: string;
    version: string;
    config: {
      uri: string;
      headers?: Array<{ key: string; value: string }>;
      authScheme?: Record<string, unknown>;
    };
  };
  created?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}

export interface OktaInlineHook {
  id: string;
  name: string;
  type: string;
  version: string;
  status: string;
  channel: {
    type: string;
    version: string;
    config: {
      uri: string;
      headers?: Array<{ key: string; value: string }>;
      method?: string;
      authScheme?: Record<string, unknown>;
    };
  };
  created?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}
