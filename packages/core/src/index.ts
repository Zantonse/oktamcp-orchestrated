// @okta-mcp/core — barrel export
// Every public API of the core package is re-exported here.

export { OktaClient, type OktaClientOptions } from "./client.js";
export { IgaClient } from "./iga-client.js";
export { OAuthTokenProvider, type OAuthConfig } from "./oauth.js";
export {
  OktaApiError,
  parseOktaErrorBody,
  OKTA_ERROR_CODES,
  type OktaErrorBody,
  type OktaErrorCause,
} from "./errors.js";
export { parseLinkHeader, fetchAllPages } from "./pagination.js";
export { attachRetryInterceptor } from "./backoff.js";
export type {
  OktaUser,
  OktaGroup,
  OktaApp,
  OktaPolicy,
  OktaErrorResponse,
  OktaListResponse,
  IgaEntitlement,
  IgaCampaign,
  IgaBundle,
  IgaAccessRequest,
  AuthServer,
  OAuthScope,
  OAuthClaim,
  OktaDevice,
  OktaEventHook,
  OktaInlineHook,
} from "./types.js";
