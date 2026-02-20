import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { attachRetryInterceptor } from "./backoff.js";
import { OktaApiError, parseOktaErrorBody } from "./errors.js";
import { OAuthTokenProvider } from "./oauth.js";

/**
 * Options accepted by OktaClient (and IgaClient).
 *
 * `requiredScopes` is only used when OAuth 2.0 authentication is active
 * (i.e. OKTA_CLIENT_ID + OKTA_PRIVATE_KEY are set). When SSWS token auth
 * is used, scopes are ignored because SSWS tokens inherit the permissions
 * of the admin who created them.
 */
export interface OktaClientOptions {
  /** OAuth 2.0 scopes this server needs. Merged with OKTA_SCOPES env var. */
  requiredScopes?: string[];
}

/**
 * HTTP client for the Okta REST API.
 *
 * Supports two authentication methods (auto-detected from environment):
 *
 *  1. **OAuth 2.0 service-app** (preferred):
 *     Set OKTA_CLIENT_ID + OKTA_PRIVATE_KEY.
 *     Tokens are scoped — each server requests only the scopes it needs.
 *
 *  2. **SSWS API token** (legacy):
 *     Set OKTA_API_TOKEN.
 *     Token permissions are determined by the creating admin's role.
 *
 * Rate-limit (429) retries are handled automatically via the backoff
 * interceptor.
 */
export class OktaClient {
  readonly baseUrl: string;
  protected readonly http: AxiosInstance;
  protected tokenProvider: OAuthTokenProvider | null = null;

  constructor(options?: OktaClientOptions) {
    const orgUrl = process.env.OKTA_ORG_URL;
    if (!orgUrl) {
      throw new Error(
        "OKTA_ORG_URL environment variable is required. " +
          "Set it to your Okta org URL, e.g. https://your-org.okta.com",
      );
    }

    const cleanOrgUrl = orgUrl.replace(/\/+$/, "");

    // ── Determine auth method ──────────────────────────────────────
    const clientId = process.env.OKTA_CLIENT_ID;
    const privateKey = process.env.OKTA_PRIVATE_KEY;
    const apiToken = process.env.OKTA_API_TOKEN;

    const useOAuth = !!(clientId && privateKey);
    if (!useOAuth && !apiToken) {
      throw new Error(
        "Authentication is required. Provide either:\n" +
          "  • OKTA_CLIENT_ID + OKTA_PRIVATE_KEY (OAuth 2.0 service app), or\n" +
          "  • OKTA_API_TOKEN (SSWS API token)\n" +
          "See the README for setup instructions.",
      );
    }

    // ── Base URL ───────────────────────────────────────────────────
    this.baseUrl = cleanOrgUrl + "/api/v1";

    // ── Axios instance ─────────────────────────────────────────────
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // ── Auth: OAuth 2.0 ────────────────────────────────────────────
    if (useOAuth) {
      const envScopes = process.env.OKTA_SCOPES?.split(/\s+/).filter(Boolean) ?? [];
      const scopes = mergeScopes(options?.requiredScopes ?? [], envScopes);

      if (scopes.length === 0) {
        throw new Error(
          "OAuth 2.0 mode requires at least one scope. " +
            "Pass requiredScopes to the client or set OKTA_SCOPES.",
        );
      }

      this.tokenProvider = new OAuthTokenProvider({
        orgUrl: cleanOrgUrl,
        clientId: clientId!,
        privateKey: privateKey!,
        scopes,
      });

      // Request interceptor: inject Bearer token before every request
      this.http.interceptors.request.use(async (config) => {
        const token = await this.tokenProvider!.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });

      process.stderr.write(
        `[okta-mcp] Using OAuth 2.0 (client_id=${clientId}, scopes=${scopes.join(" ")})\n`,
      );
    } else {
      // ── Auth: SSWS ─────────────────────────────────────────────
      this.http.defaults.headers.common["Authorization"] = `SSWS ${apiToken}`;
    }

    attachRetryInterceptor(this.http);
  }

  /**
   * Central request method. All convenience methods delegate here.
   * Catches Axios errors and re-throws them as structured OktaApiError
   * when the response body matches the Okta error shape.
   */
  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.http.request<T>(config);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const parsed = parseOktaErrorBody(err.response.data);
        if (parsed) {
          throw new OktaApiError(err.response.status, parsed);
        }
      }
      throw err;
    }
  }

  async get<T = unknown>(
    path: string,
    options?: { params?: Record<string, unknown> },
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "GET", url: path, params: options?.params });
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> },
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "POST", url: path, data, params: options?.params });
  }

  async put<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> },
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PUT", url: path, data, params: options?.params });
  }

  async delete<T = unknown>(
    path: string,
    options?: { params?: Record<string, unknown> },
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "DELETE", url: path, params: options?.params });
  }

  async patch<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> },
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PATCH", url: path, data, params: options?.params });
  }
}

/** Deduplicate and merge two scope arrays. */
function mergeScopes(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}
