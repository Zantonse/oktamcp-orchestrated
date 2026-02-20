import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

const MAX_RETRIES = 3;

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

/**
 * Attaches a 429 rate-limit retry interceptor to an Axios instance.
 *
 * When the Okta API returns HTTP 429, the interceptor reads the
 * `Retry-After` header (value in seconds), waits that duration,
 * and replays the request — up to MAX_RETRIES times.
 */
export function attachRetryInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (!config) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 429) {
      return Promise.reject(error);
    }

    const retryCount = config._retryCount ?? 0;
    if (retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config._retryCount = retryCount + 1;

    const retryAfterHeader = error.response.headers["retry-after"];
    const retryAfterSeconds =
      retryAfterHeader && !isNaN(Number(retryAfterHeader))
        ? Number(retryAfterHeader)
        : 1;

    process.stderr.write(
      `[okta-mcp] Rate limited (429). Retry ${config._retryCount}/${MAX_RETRIES} after ${retryAfterSeconds}s\n`
    );

    await sleep(retryAfterSeconds * 1000);

    return instance.request(config);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
