import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { attachRetryInterceptor } from "./backoff.js";
import { OktaApiError, parseOktaErrorBody } from "./errors.js";
import { OAuthTokenProvider } from "./oauth.js";
import type { OktaClientOptions } from "./client.js";

/**
 * HTTP client for Okta Identity Governance & Administration (IGA) APIs.
 *
 * Extends the standard Okta client pattern with:
 *  - `X-Okta-Request-Type: iga` header on every request
 *  - Base path override to `/api/v1/governance`
 *  - Same dual-auth support (OAuth 2.0 / SSWS) as OktaClient
 */
export class IgaClient {
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

    this.baseUrl = cleanOrgUrl + "/api/v1/governance";

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Okta-Request-Type": "iga",
      },
    });

    // ── Auth: OAuth 2.0 ────────────────────────────────────────────
    if (useOAuth) {
      const envScopes = process.env.OKTA_SCOPES?.split(/\s+/).filter(Boolean) ?? [];
      const merged = [...new Set([...(options?.requiredScopes ?? []), ...envScopes])];

      if (merged.length === 0) {
        throw new Error(
          "OAuth 2.0 mode requires at least one scope. " +
            "Pass requiredScopes to the client or set OKTA_SCOPES.",
        );
      }

      this.tokenProvider = new OAuthTokenProvider({
        orgUrl: cleanOrgUrl,
        clientId: clientId!,
        privateKey: privateKey!,
        scopes: merged,
      });

      this.http.interceptors.request.use(async (config) => {
        const token = await this.tokenProvider!.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });
    } else {
      this.http.defaults.headers.common["Authorization"] = `SSWS ${apiToken}`;
    }

    attachRetryInterceptor(this.http);
  }

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
