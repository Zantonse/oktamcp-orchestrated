import crypto from "node:crypto";

/**
 * OAuth 2.0 token provider for Okta service apps.
 *
 * Implements the client-credentials flow with a private-key JWT assertion
 * (RFC 7523). The JWT is signed locally with an RSA key, exchanged at
 * the Okta `/oauth2/v1/token` endpoint for a short-lived Bearer access
 * token, and cached until it nears expiry.
 */

export interface OAuthConfig {
  /** Okta org URL, e.g. https://your-org.okta.com */
  orgUrl: string;
  /** OAuth 2.0 client ID of the Okta service app */
  clientId: string;
  /** RSA private key — PEM string or JSON-serialized JWK */
  privateKey: string;
  /** OAuth 2.0 scopes to request */
  scopes: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Buffer (in ms) before expiry at which a proactive refresh is triggered. */
const EXPIRY_BUFFER_MS = 60_000;

export class OAuthTokenProvider {
  private readonly config: OAuthConfig;
  private readonly key: crypto.KeyObject;
  private accessToken: string | null = null;
  private expiresAt = 0;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.key = resolvePrivateKey(config.privateKey);
  }

  /** Returns a valid access token, refreshing transparently when needed. */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt - EXPIRY_BUFFER_MS) {
      return this.accessToken;
    }
    return this.refresh();
  }

  /* ------------------------------------------------------------------ */

  private async refresh(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: this.config.clientId,
      sub: this.config.clientId,
      aud: `${this.config.orgUrl}/oauth2/v1/token`,
      iat: now,
      exp: now + 300, // 5-minute JWT lifetime
      jti: crypto.randomUUID(),
    };

    const jwt = signJwt(claims, this.key);

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: jwt,
      scope: this.config.scopes.join(" "),
    });

    const resp = await fetch(
      `${this.config.orgUrl}/oauth2/v1/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(
        `Okta OAuth token request failed (${resp.status}): ${errText}`,
      );
    }

    const data = (await resp.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;

    process.stderr.write(
      `[okta-mcp] OAuth token acquired (scopes: ${data.scope}, expires in ${data.expires_in}s)\n`,
    );

    return this.accessToken;
  }
}

/* ====================================================================
 * Internal helpers
 * ==================================================================== */

/**
 * Accepts either a PEM string or a JSON-serialised JWK and returns
 * a Node.js KeyObject suitable for signing.
 */
function resolvePrivateKey(keyInput: string): crypto.KeyObject {
  const trimmed = keyInput.trim();

  // JWK (JSON)
  if (trimmed.startsWith("{")) {
    try {
      const jwk = JSON.parse(trimmed);
      return crypto.createPrivateKey({ key: jwk, format: "jwk" });
    } catch {
      throw new Error(
        "OKTA_PRIVATE_KEY looks like JSON but could not be parsed as a JWK.",
      );
    }
  }

  // PEM — handle env-var-escaped newlines
  const pem = trimmed.replace(/\\n/g, "\n");
  return crypto.createPrivateKey(pem);
}

/** Create a compact RS256 JWT from claims and a private key. */
function signJwt(
  claims: Record<string, unknown>,
  key: crypto.KeyObject,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");

  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");

  const signature = crypto
    .sign("sha256", Buffer.from(`${header}.${payload}`), key)
    .toString("base64url");

  return `${header}.${payload}.${signature}`;
}
