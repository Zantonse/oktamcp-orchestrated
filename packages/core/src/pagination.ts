import type { OktaClient } from "./client.js";

/**
 * Parses an RFC 5988 Link header and extracts the `next` URL.
 *
 * Okta uses Link headers for cursor-based pagination:
 *   Link: <https://org.okta.com/api/v1/users?after=abc>; rel="next"
 */
export function parseLinkHeader(
  linkHeader: string | undefined | null
): { next?: string } {
  if (!linkHeader) return {};

  const result: { next?: string } = {};
  const parts = linkHeader.split(",");

  for (const part of parts) {
    const urlMatch = part.match(/<([^>]+)>/);
    const relMatch = part.match(/rel="([^"]+)"/);

    if (urlMatch && relMatch && relMatch[1] === "next") {
      result.next = urlMatch[1];
    }
  }

  return result;
}

/**
 * Async generator that auto-follows Okta pagination cursors.
 *
 * Yields each page of results as an array. The caller can iterate
 * with `for await (const page of fetchAllPages(...))`.
 *
 * Stops when there is no `next` link in the response headers.
 */
export async function* fetchAllPages<T = unknown>(
  client: OktaClient,
  path: string,
  params?: Record<string, unknown>
): AsyncGenerator<T[]> {
  let url: string | undefined = path;
  let queryParams: Record<string, unknown> | undefined = params;

  while (url) {
    const resp = await client.get<T[]>(url, {
      params: queryParams,
    });

    yield resp.data;

    const linkHeader =
      typeof resp.headers?.link === "string" ? resp.headers.link : undefined;
    const { next } = parseLinkHeader(linkHeader);

    if (next) {
      // The next URL is absolute — extract the path portion relative to baseUrl
      try {
        const nextUrl = new URL(next);
        url = nextUrl.pathname + nextUrl.search;
      } catch {
        url = next;
      }
      // Subsequent requests use the cursor embedded in the URL, not the original params
      queryParams = undefined;
    } else {
      url = undefined;
    }
  }
}
