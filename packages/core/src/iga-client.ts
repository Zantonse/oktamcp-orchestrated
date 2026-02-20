import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { attachRetryInterceptor } from "./backoff.js";
import { OktaApiError, parseOktaErrorBody } from "./errors.js";

/**
 * HTTP client for Okta Identity Governance & Administration (IGA) APIs.
 *
 * Extends the standard Okta client pattern with:
 *  - `X-Okta-Request-Type: iga` header on every request
 *  - Base path override to `/api/v1/governance`
 */
export class IgaClient {
  readonly baseUrl: string;
  protected readonly http: AxiosInstance;

  constructor() {
    const orgUrl = process.env.OKTA_ORG_URL;
    if (!orgUrl) {
      throw new Error(
        "OKTA_ORG_URL environment variable is required. " +
          "Set it to your Okta org URL, e.g. https://your-org.okta.com"
      );
    }

    const apiToken = process.env.OKTA_API_TOKEN;
    if (!apiToken) {
      throw new Error(
        "OKTA_API_TOKEN environment variable is required. " +
          "Create one at Security > API > Tokens in your Okta admin console."
      );
    }

    this.baseUrl = orgUrl.replace(/\/+$/, "") + "/api/v1/governance";

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `SSWS ${apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Okta-Request-Type": "iga",
      },
    });

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
    options?: { params?: Record<string, unknown> }
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "GET", url: path, params: options?.params });
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> }
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "POST", url: path, data, params: options?.params });
  }

  async put<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> }
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PUT", url: path, data, params: options?.params });
  }

  async delete<T = unknown>(
    path: string,
    options?: { params?: Record<string, unknown> }
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "DELETE", url: path, params: options?.params });
  }

  async patch<T = unknown>(
    path: string,
    data?: unknown,
    options?: { params?: Record<string, unknown> }
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ method: "PATCH", url: path, data, params: options?.params });
  }
}
