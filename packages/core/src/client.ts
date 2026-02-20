import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { attachRetryInterceptor } from "./backoff.js";
import { OktaApiError, parseOktaErrorBody } from "./errors.js";

/**
 * HTTP client for the Okta REST API.
 *
 * Reads OKTA_ORG_URL and OKTA_API_TOKEN from environment variables,
 * sets up SSWS authentication, and provides convenience methods for
 * every HTTP verb. Rate-limit (429) retries are handled automatically
 * via the backoff interceptor.
 */
export class OktaClient {
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

    // Strip trailing slash for consistency
    this.baseUrl = orgUrl.replace(/\/+$/, "") + "/api/v1";

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `SSWS ${apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

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
