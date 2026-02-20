# Okta MCP System

## Architecture

Monorepo: shared core package + 5 MCP servers, all TypeScript.

| Package | npm Name | Purpose |
|---------|----------|---------|
| packages/core | @okta-mcp/core | Shared HTTP client, error handling, pagination, types (NOT an MCP server) |
| packages/users | okta-mcp-users | User lifecycle, MFA factors, sessions (26 tools) |
| packages/apps | okta-mcp-apps | Application management, SSO, assignments (18 tools) |
| packages/governance | okta-mcp-governance | IGA: access reviews, entitlements, bundles, requests (21 tools) |
| packages/policy | okta-mcp-policy | Auth servers, OAuth2 scopes, claims, inline hooks (33 tools) |
| packages/admin | okta-mcp-admin | Admin roles, system log, devices, event hooks (25 tools) |

**Total: 123 MCP tools across 5 servers.**

## Environment Variables

Two authentication methods are supported. Set **one** of the two groups:

### Option A: OAuth 2.0 Service App (recommended)

| Variable | Required | Description |
|----------|----------|-------------|
| OKTA_ORG_URL | Yes | e.g. `https://your-org.okta.com` |
| OKTA_CLIENT_ID | Yes | OAuth 2.0 client ID of the Okta service app |
| OKTA_PRIVATE_KEY | Yes | RSA private key (PEM string or JSON JWK) |
| OKTA_SCOPES | No | Space-separated scopes to add beyond server defaults |

### Option B: SSWS API Token (legacy)

| Variable | Required | Description |
|----------|----------|-------------|
| OKTA_ORG_URL | Yes | e.g. `https://your-org.okta.com` |
| OKTA_API_TOKEN | Yes | SSWS token from Security > API > Tokens |

Stored in root `.env` (gitignored). **Never hardcode credentials.**

### OAuth 2.0 Scopes by Server

Each server declares its own `requiredScopes`. The union across all 5 servers:

```
okta.users.read       okta.users.manage
okta.groups.read      okta.groups.manage
okta.apps.read        okta.apps.manage
okta.policies.read    okta.policies.manage
okta.logs.read
okta.eventHooks.read  okta.eventHooks.manage
okta.devices.read     okta.devices.manage
okta.authenticators.read okta.authenticators.manage
okta.roles.read       okta.roles.manage
okta.sessions.read    okta.sessions.manage
okta.authorizationServers.read okta.authorizationServers.manage
okta.inlineHooks.read okta.inlineHooks.manage
```

| Server | Scopes |
|--------|--------|
| okta-mcp-users | `okta.users.read/manage`, `okta.groups.read`, `okta.apps.read`, `okta.roles.read`, `okta.authenticators.read/manage`, `okta.sessions.read/manage` |
| okta-mcp-apps | `okta.apps.read/manage`, `okta.users.read`, `okta.groups.read/manage` |
| okta-mcp-governance | `okta.users.read`, `okta.groups.read`, `okta.apps.read` |
| okta-mcp-policy | `okta.policies.read/manage`, `okta.authorizationServers.read/manage`, `okta.inlineHooks.read/manage` |
| okta-mcp-admin | `okta.roles.read/manage`, `okta.logs.read`, `okta.devices.read/manage`, `okta.eventHooks.read/manage` |

## Build Order

1. `npm install` at workspace root
2. `npm run build -w packages/core` (must complete first)
3. All 5 servers can build in parallel after core

## Workspace Commands

```bash
npm install                           # Install all deps
npm run build -w packages/core        # Build core only
npm run build --workspaces            # Build everything
npx tsc --noEmit                      # Type check (run in package dir)
```

## Import Patterns

```typescript
// All servers import from core:
import {
  OktaClient,
  OktaApiError,
  parseOktaErrorBody,
  fetchAllPages,
  parseLinkHeader,
} from "@okta-mcp/core";

// Governance server also uses:
import { IgaClient } from "@okta-mcp/core";
```

## @okta-mcp/core Exports

| Export | File | Purpose |
|--------|------|---------|
| OktaClient | client.ts | HTTP client with OAuth 2.0 / SSWS auth, retry, base URL handling |
| OktaClientOptions | client.ts | Constructor options interface (requiredScopes) |
| IgaClient | iga-client.ts | Extends OktaClient pattern with IGA headers, /governance base path |
| OAuthTokenProvider | oauth.ts | Client-credentials token provider (JWT assertion → Bearer token) |
| OAuthConfig | oauth.ts | Configuration interface for OAuth token provider |
| OktaApiError | errors.ts | Structured error class with friendly messages |
| parseOktaErrorBody | errors.ts | Safe parser for Okta error response bodies |
| OKTA_ERROR_CODES | errors.ts | Map of E0000xxx codes to human-readable strings |
| parseLinkHeader | pagination.ts | Extracts `next` cursor from Link header |
| fetchAllPages | pagination.ts | Async generator that auto-follows pagination cursors |
| OktaUser, OktaGroup, OktaApp, etc. | types.ts | Shared TypeScript interfaces |

## MCP Server Code Structure

Every server follows this layout:

```
packages/{name}/
  package.json
  tsconfig.json
  src/
    index.ts                # Entry point: create server, register tools, connect stdio
    tools/
      {category}.ts         # One file per tool category, exports register function
```

### Entry Point Pattern (src/index.ts)

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerUserLifecycleTools } from "./tools/user-lifecycle.js";
import { registerFactorTools } from "./tools/factors.js";
// ... more imports

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-users",
  version: "0.1.0",
});

registerUserLifecycleTools(server, client);
registerFactorTools(server, client);
// ... more registrations

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Registration Pattern

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OktaClient } from "@okta-mcp/core";

export function registerUserLifecycleTools(server: McpServer, client: OktaClient) {
  server.tool(
    "okta_list_users",
    "List users in the Okta org with search, filter, and pagination. Use 'q' for name matching, 'search' for SCIM queries, or 'filter' for status filtering.",
    {
      q: z.string().optional().describe("Simple search across firstName, lastName, email"),
      search: z.string().optional().describe("SCIM filter expression"),
      filter: z.string().optional().describe("Okta filter expression, e.g. status eq \"ACTIVE\""),
      limit: z.number().min(1).max(200).optional().describe("Max results per page (default 50, max 200)"),
      after: z.string().optional().describe("Pagination cursor from previous response"),
    },
    async ({ q, search, filter, limit, after }) => {
      const resp = await client.get("/users", {
        params: { q, search, filter, limit, after },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  // ... more tools
}
```

## Zod Schema Conventions

- All optional Okta params: `.optional()`
- Enums: `z.enum([...])` with known Okta values
- IDs: `z.string().describe("Okta {entity} ID")`
- Pagination: every list tool has `limit` and `after` params
- **Every parameter gets `.describe()`** — these become MCP parameter descriptions

## Tool Description Standards

Every tool description must:
1. State what the tool DOES (first sentence)
2. Explain when to USE it vs similar tools
3. Warn about destructive/irreversible operations
4. Note prerequisite states (e.g., "user must be DEPROVISIONED before delete")

## Okta API Conventions

- Auth: `Authorization: SSWS {token}`
- Base URL: `{OKTA_ORG_URL}/api/v1`
- IGA base: `{OKTA_ORG_URL}/api/v1/governance` (with `X-Okta-Request-Type: iga` header)
- Pagination: `Link` header with `rel="next"` (RFC 5988)
- Rate limits: HTTP 429 with `Retry-After` header (seconds)
- Errors: `{ errorCode, errorSummary, errorLink, errorId, errorCauses[] }`

## Common Filter Expressions

| Use Case | Expression |
|----------|-----------|
| Active users | `status eq "ACTIVE"` |
| By department | `profile.department eq "Engineering"` |
| By email domain | `profile.email sw "user@example"` |
| Active SAML apps | `status eq "ACTIVE" and name eq "template_saml_2_0"` |
| Failed logins (syslog) | `eventType eq "user.authentication.auth_via_mfa" and outcome.result eq "FAILURE"` |
| Admin actions (syslog) | `eventType sw "user.account"` |

## Rate Limits

| Category | Limit | Strategy |
|----------|-------|----------|
| Users Read (GET) | 600 req/min | Exponential backoff on 429 |
| Users Write (POST/PUT) | 300 req/min | Retry-After header |
| System Log | 60 req/min | Use date ranges to reduce calls |
| Auth Servers | 100 req/min | Cache where safe |
| IGA Endpoints | Varies | IgaClient backoff from core |

## User Status Flow

```
STAGED ──activate──> PROVISIONED ──activate──> ACTIVE
                                                 │
                                        suspend / deactivate
                                                 │
                                       SUSPENDED   DEPROVISIONED
                                                        │
                                                     delete()
                                                  (irreversible)
```

## Package.json Template (Servers)

```json
{
  "name": "okta-mcp-{name}",
  "version": "0.1.0",
  "description": "Okta MCP server for {domain}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@okta-mcp/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

## tsconfig.json Template (Servers)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "okta-users": {
      "command": "node",
      "args": ["<absolute-path>/packages/users/dist/index.js"],
      "env": { "OKTA_ORG_URL": "...", "OKTA_API_TOKEN": "..." }
    },
    "okta-apps": {
      "command": "node",
      "args": ["<absolute-path>/packages/apps/dist/index.js"],
      "env": { "OKTA_ORG_URL": "...", "OKTA_API_TOKEN": "..." }
    },
    "okta-governance": {
      "command": "node",
      "args": ["<absolute-path>/packages/governance/dist/index.js"],
      "env": { "OKTA_ORG_URL": "...", "OKTA_API_TOKEN": "..." }
    },
    "okta-policy": {
      "command": "node",
      "args": ["<absolute-path>/packages/policy/dist/index.js"],
      "env": { "OKTA_ORG_URL": "...", "OKTA_API_TOKEN": "..." }
    },
    "okta-admin": {
      "command": "node",
      "args": ["<absolute-path>/packages/admin/dist/index.js"],
      "env": { "OKTA_ORG_URL": "...", "OKTA_API_TOKEN": "..." }
    }
  }
}
```
