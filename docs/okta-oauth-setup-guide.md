# Okta OAuth 2.0 Setup Guide for MCP Servers

This guide walks you through creating and configuring an OAuth 2.0 service app in your Okta admin console, generating the credentials, granting the required scopes, and wiring everything into the Okta MCP system.

---

## Prerequisites

- **Okta admin access** — you need the **Super Admin** or **Org Admin** role to create apps and grant scopes
- **Okta org URL** — e.g. `https://your-org.okta.com` (or `https://your-org.oktapreview.com` for sandbox)
- For the Governance server: an **Okta Identity Governance (IGA) add-on license** on the org

---

## Step 1: Create the API Service App

1. Log in to your **Okta Admin Console**
2. Navigate to **Applications > Applications**
3. Click **Create App Integration**
4. Select **API Services** and click **Next**
5. Give it a name — e.g. `MCP Server Integration`
6. Click **Save**

You'll land on the app's **General** tab. Note the **Client ID** displayed at the top — you'll need it for the `.env` file.

---

## Step 2: Add a Public Key (RSA Key Pair)

The service app uses a signed JWT assertion to authenticate — no shared secret is sent over the wire. You need to provide Okta with a public key and keep the matching private key on your machine.

### Option A: Let Okta Generate the Key Pair (easiest)

1. On the app's **General** tab, scroll to **Client Credentials**
2. Click **Edit** on the Client Credentials section
3. Change **Client authentication** to **Public key / Private key**
4. Under **Public Keys**, click **Add Key**
5. Click **Generate new key**
6. Okta shows the private key in **JWK format** — **copy and save it immediately**. This is the only time Okta shows the private key.
7. Click **Done**, then **Save**

> **Important:** Save the private key JWK somewhere secure. You will paste it into your `.env` file. Okta does not store or display the private key again after this step.

### Option B: Generate Your Own RSA Key Pair

If you prefer to generate your own key:

```bash
# Generate a 2048-bit RSA private key (PEM format)
openssl genrsa -out private-key.pem 2048

# Extract the public key
openssl rsa -in private-key.pem -pubout -out public-key.pem
```

Then upload the public key to Okta:

1. On the app's **General** tab, scroll to **Client Credentials**
2. Click **Edit** on the Client Credentials section
3. Change **Client authentication** to **Public key / Private key**
4. Under **Public Keys**, click **Add Key**
5. Instead of generating, paste your public key or upload the `public-key.pem` file
6. Click **Done**, then **Save**

> The MCP code accepts the private key in either **PEM** or **JWK** format — both work. See Step 4 for how to set it in the `.env` file.

---

## Step 3: Grant OAuth 2.0 Scopes

Each MCP server requests a specific set of scopes. You must grant all of them to the service app.

1. Still on the app page, go to the **Okta API Scopes** tab
2. You'll see a list of available scopes
3. Click **Grant** next to each scope listed below

### All Required Scopes

Grant **every** scope in the table. If you plan to run all 5 servers, you need all of them:

| Scope | Used By |
|-------|---------|
| `okta.users.read` | users, apps, governance |
| `okta.users.manage` | users |
| `okta.groups.read` | users, apps, governance |
| `okta.groups.manage` | apps |
| `okta.apps.read` | users, apps, governance |
| `okta.apps.manage` | apps |
| `okta.roles.read` | users, admin |
| `okta.roles.manage` | admin |
| `okta.policies.read` | policy |
| `okta.policies.manage` | policy |
| `okta.authorizationServers.read` | policy |
| `okta.authorizationServers.manage` | policy |
| `okta.inlineHooks.read` | policy |
| `okta.inlineHooks.manage` | policy |
| `okta.authenticators.read` | users |
| `okta.authenticators.manage` | users |
| `okta.sessions.read` | users |
| `okta.sessions.manage` | users |
| `okta.logs.read` | admin |
| `okta.devices.read` | admin |
| `okta.devices.manage` | admin |
| `okta.eventHooks.read` | admin |
| `okta.eventHooks.manage` | admin |

That's **23 scopes** total.

> **Tip:** If you only plan to run a subset of servers, you can grant just the scopes for those servers. Each server only requests what it needs — the token exchange will fail if a required scope hasn't been granted.

### Scopes per Server (if you want to be selective)

| Server | Scopes to Grant |
|--------|----------------|
| okta-mcp-users | `okta.users.read`, `okta.users.manage`, `okta.groups.read`, `okta.apps.read`, `okta.roles.read`, `okta.authenticators.read`, `okta.authenticators.manage`, `okta.sessions.read`, `okta.sessions.manage` |
| okta-mcp-apps | `okta.apps.read`, `okta.apps.manage`, `okta.users.read`, `okta.groups.read`, `okta.groups.manage` |
| okta-mcp-governance | `okta.users.read`, `okta.groups.read`, `okta.apps.read` |
| okta-mcp-policy | `okta.policies.read`, `okta.policies.manage`, `okta.authorizationServers.read`, `okta.authorizationServers.manage`, `okta.inlineHooks.read`, `okta.inlineHooks.manage` |
| okta-mcp-admin | `okta.roles.read`, `okta.roles.manage`, `okta.logs.read`, `okta.devices.read`, `okta.devices.manage`, `okta.eventHooks.read`, `okta.eventHooks.manage` |

---

## Step 4: Configure Your `.env` File

In the root of the `okta-mcp` project, create or update the `.env` file with three variables:

```env
OKTA_ORG_URL=https://your-org.okta.com
OKTA_CLIENT_ID=0oa1234567890abcdef
OKTA_PRIVATE_KEY=<your-private-key>
```

### Setting the Private Key

The `OKTA_PRIVATE_KEY` value depends on which format you used:

**If you used Okta's generated key (JWK format):**

Paste the entire JSON object on a single line:

```env
OKTA_PRIVATE_KEY={"kty":"RSA","d":"...","e":"AQAB","use":"sig","kid":"...","n":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"..."}
```

**If you generated your own PEM key:**

Either paste the PEM with `\n` escapes on a single line:

```env
OKTA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n...\n-----END PRIVATE KEY-----
```

Or reference the file path is **not** supported by the code — the value must be the key content itself.

### Remove SSWS Token (if present)

If you previously used SSWS, remove or comment out `OKTA_API_TOKEN`:

```env
# OKTA_API_TOKEN=00abc...  ← remove this
```

When both `OKTA_CLIENT_ID`/`OKTA_PRIVATE_KEY` and `OKTA_API_TOKEN` are set, OAuth takes precedence. But it's cleaner to remove the SSWS token.

---

## Step 5: Verify the Setup

Build and start any server to verify the OAuth flow works:

```bash
# From the project root
npm run build -w packages/core
npm run build -w packages/users

# Start the users server
node packages/users/dist/index.js
```

On successful startup, you should see this on stderr:

```
[okta-mcp] Using OAuth 2.0 (client_id=0oa1234567890abcdef, scopes=okta.users.read okta.users.manage okta.groups.read okta.apps.read okta.roles.read okta.authenticators.read okta.authenticators.manage okta.sessions.read okta.sessions.manage)
```

When the first API call is made, you'll see:

```
[okta-mcp] OAuth token acquired (scopes: okta.users.read okta.users.manage ..., expires in 3600s)
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Okta OAuth token request failed (401)` | Client ID is wrong, or the private key doesn't match the public key registered in Okta | Double-check the Client ID on the app's General tab; re-generate the key pair |
| `Okta OAuth token request failed (403)` | Scopes not granted to the service app | Go to the app's Okta API Scopes tab and grant the missing scopes |
| `OKTA_PRIVATE_KEY looks like JSON but could not be parsed as a JWK` | Malformed JWK — likely truncated or has extra whitespace | Ensure the full JWK JSON is on one line with no line breaks |
| `OAuth 2.0 mode requires at least one scope` | Server's `requiredScopes` is empty and `OKTA_SCOPES` env var is not set | This shouldn't happen with the default server configs — check that you're running a built server, not an old version |
| `error:0480006C:PEM routines:OPENSSL_internal:NO_START_LINE` | PEM key format issue — likely the `\n` escape sequences weren't converted | Make sure the PEM string uses literal `\n` (two characters) in the env var — the code handles the conversion |

---

## Step 6: Claude Desktop / MCP Client Configuration

When configuring your MCP client (e.g., Claude Desktop), pass the credentials via the `env` block. All 5 servers share the same credentials:

```json
{
  "mcpServers": {
    "okta-users": {
      "command": "node",
      "args": ["/absolute/path/to/packages/users/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oa1234567890abcdef",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\",\"n\":\"...\"}"
      }
    },
    "okta-apps": {
      "command": "node",
      "args": ["/absolute/path/to/packages/apps/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oa1234567890abcdef",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\",\"n\":\"...\"}"
      }
    },
    "okta-governance": {
      "command": "node",
      "args": ["/absolute/path/to/packages/governance/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oa1234567890abcdef",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\",\"n\":\"...\"}"
      }
    },
    "okta-policy": {
      "command": "node",
      "args": ["/absolute/path/to/packages/policy/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oa1234567890abcdef",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\",\"n\":\"...\"}"
      }
    },
    "okta-admin": {
      "command": "node",
      "args": ["/absolute/path/to/packages/admin/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oa1234567890abcdef",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\",\"n\":\"...\"}"
      }
    }
  }
}
```

> **Note:** In the JSON config, the JWK private key must have its inner quotes escaped (`\"`). If using a PEM key, use `\\n` for newlines within the JSON string.

---

## Security Best Practices

1. **Never commit credentials.** The `.env` file is gitignored. The Claude Desktop config lives outside the repo. Keep it that way.
2. **Use a dedicated service app.** Don't reuse an app integration meant for end-user SSO.
3. **Grant least-privilege scopes.** If you only need the users and apps servers, don't grant policy or admin scopes.
4. **Rotate keys periodically.** Generate a new key pair, add the new public key to the Okta app, update your `.env`, then remove the old public key from Okta.
5. **Use a sandbox org for development.** Create an Okta Developer Edition org at [developer.okta.com/signup](https://developer.okta.com/signup/) for testing.
6. **Monitor with System Log.** The admin server's `okta_search_system_log` tool can query `eventType eq "app.oauth2.token.grant.client_credentials"` to audit token grants from your service app.

---

## How It Works Under the Hood

For reference, here's what the MCP servers do with these credentials:

1. On startup, the server detects `OKTA_CLIENT_ID` + `OKTA_PRIVATE_KEY` in the environment
2. It creates an `OAuthTokenProvider` with the server's declared `requiredScopes`
3. On the first API call, the provider:
   - Builds a JWT with `iss` and `sub` = your Client ID, `aud` = `{OKTA_ORG_URL}/oauth2/v1/token`
   - Signs it with your private key (RS256)
   - POSTs it to Okta's `/oauth2/v1/token` endpoint (client credentials grant)
   - Receives a Bearer access token (typically valid for 1 hour)
4. The token is cached and automatically refreshed 60 seconds before expiry
5. Every API request includes `Authorization: Bearer {token}` in the header
