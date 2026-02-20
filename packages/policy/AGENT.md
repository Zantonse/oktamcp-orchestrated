# AGENT SPEC: okta-mcp-policy

## Overview
Build the complete `okta-mcp-policy` MCP server — 33 tools covering Okta Authorization Servers, OAuth2 Scopes, Claims, Auth Server Policies, and Inline Hooks.

This is the largest server by tool count. Organize code carefully across 5 tool files.

## Working Directory
`/Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/policy/`

## Prerequisites
- `@okta-mcp/core` is already built at `../core/dist/`
- Read `../../CLAUDE.md` for architecture, code patterns, and conventions
- Read `../core/src/index.ts` to see what core exports

## API Reference
- Auth Servers: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/AuthorizationServer/
- Policies: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Policy/
- Inline Hooks: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/InlineHook/

---

## Step 1: Create package.json

```json
{
  "name": "okta-mcp-policy",
  "version": "0.1.0",
  "description": "Okta MCP server for authorization servers, OAuth2 scopes, claims, policies, and inline hooks",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "okta-mcp-policy": "dist/index.js"
  },
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

## Step 2: Create tsconfig.json

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

## Step 3: Create src/index.ts

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerAuthServerTools } from "./tools/auth-servers.js";
import { registerScopeTools } from "./tools/scopes.js";
import { registerClaimTools } from "./tools/claims.js";
import { registerAuthPolicyTools } from "./tools/auth-policies.js";
import { registerInlineHookTools } from "./tools/inline-hooks.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-policy",
  version: "0.1.0",
});

registerAuthServerTools(server, client);
registerScopeTools(server, client);
registerClaimTools(server, client);
registerAuthPolicyTools(server, client);
registerInlineHookTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Step 4: Create Tool Files

Create the `src/tools/` directory and implement each file below.

---

### src/tools/auth-servers.ts — 8 tools

Export: `registerAuthServerTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_auth_servers` | GET | `/authorizationServers` | q?, limit?, after? |
| `okta_get_auth_server` | GET | `/authorizationServers/{authServerId}` | authServerId |
| `okta_create_auth_server` | POST | `/authorizationServers` | name, description, audiences (string[]) |
| `okta_update_auth_server` | PUT | `/authorizationServers/{authServerId}` | authServerId, name?, description?, audiences? |
| `okta_deactivate_auth_server` | POST | `/authorizationServers/{authServerId}/lifecycle/deactivate` | authServerId |
| `okta_delete_auth_server` | DELETE | `/authorizationServers/{authServerId}` | authServerId — **must be deactivated first** |
| `okta_rotate_auth_server_keys` | POST | `/authorizationServers/{authServerId}/credentials/lifecycle/keyRotate` | authServerId, use (z.enum(["sig"])) |
| `okta_list_auth_server_keys` | GET | `/authorizationServers/{authServerId}/credentials/keys` | authServerId |

**Description guidance:**
- `okta_rotate_auth_server_keys`: "Rotate the signing keys for an authorization server. WARNING: This invalidates all existing tokens issued by this server. Integrations relying on the old keys will break until they fetch the new JWKS. Only rotate during planned maintenance windows."
- `okta_delete_auth_server`: "Delete a custom authorization server. The server MUST be deactivated first. This removes all associated policies, scopes, and claims."

---

### src/tools/scopes.ts — 5 tools

Export: `registerScopeTools(server: McpServer, client: OktaClient)`

All scope endpoints are nested under an auth server: `/authorizationServers/{authServerId}/scopes`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_scopes` | GET | `/authorizationServers/{authServerId}/scopes` | authServerId, q? (name search), limit?, after? |
| `okta_get_scope` | GET | `/authorizationServers/{authServerId}/scopes/{scopeId}` | authServerId, scopeId |
| `okta_create_scope` | POST | `/authorizationServers/{authServerId}/scopes` | authServerId, name, description?, consent (z.enum(["REQUIRED","IMPLICIT"])), default? (boolean) |
| `okta_update_scope` | PUT | `/authorizationServers/{authServerId}/scopes/{scopeId}` | authServerId, scopeId, name?, description?, consent? |
| `okta_delete_scope` | DELETE | `/authorizationServers/{authServerId}/scopes/{scopeId}` | authServerId, scopeId |

**Note:** The `consent` field controls whether users see a consent screen. `REQUIRED` = always show consent. `IMPLICIT` = skip consent for trusted first-party apps.

---

### src/tools/claims.ts — 5 tools

Export: `registerClaimTools(server: McpServer, client: OktaClient)`

All claim endpoints: `/authorizationServers/{authServerId}/claims`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_claims` | GET | `/authorizationServers/{authServerId}/claims` | authServerId |
| `okta_get_claim` | GET | `/authorizationServers/{authServerId}/claims/{claimId}` | authServerId, claimId |
| `okta_create_claim` | POST | `/authorizationServers/{authServerId}/claims` | authServerId, name, valueType, value, claimType, conditions? |
| `okta_update_claim` | PUT | `/authorizationServers/{authServerId}/claims/{claimId}` | authServerId, claimId, name?, valueType?, value?, claimType? |
| `okta_delete_claim` | DELETE | `/authorizationServers/{authServerId}/claims/{claimId}` | authServerId, claimId |

**Claim value type Zod enum:**
```typescript
z.enum(["EXPRESSION", "GROUPS", "SYSTEM", "IDENTITY_PROVIDER"])
```

**Claim type Zod enum:**
```typescript
z.enum(["RESOURCE", "IDENTITY"])
```

**Note:** `EXPRESSION` type uses Okta Expression Language (EL). Example value: `"user.email"` or `"String.substringAfter(user.email, '@')"`.

---

### src/tools/auth-policies.ts — 7 tools

Export: `registerAuthPolicyTools(server: McpServer, client: OktaClient)`

Policies are nested under auth servers: `/authorizationServers/{authServerId}/policies`
Rules are nested under policies: `/authorizationServers/{authServerId}/policies/{policyId}/rules`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_auth_server_policies` | GET | `/authorizationServers/{authServerId}/policies` | authServerId |
| `okta_create_auth_server_policy` | POST | `/authorizationServers/{authServerId}/policies` | authServerId, name, description, priority (number), conditions (clientIds[]) |
| `okta_update_auth_server_policy` | PUT | `/authorizationServers/{authServerId}/policies/{policyId}` | authServerId, policyId, name?, description?, priority? |
| `okta_delete_auth_server_policy` | DELETE | `/authorizationServers/{authServerId}/policies/{policyId}` | authServerId, policyId |
| `okta_list_policy_rules` | GET | `/authorizationServers/{authServerId}/policies/{policyId}/rules` | authServerId, policyId |
| `okta_create_policy_rule` | POST | `/authorizationServers/{authServerId}/policies/{policyId}/rules` | authServerId, policyId, name, priority, conditions, actions |
| `okta_delete_policy_rule` | DELETE | `/authorizationServers/{authServerId}/policies/{policyId}/rules/{ruleId}` | authServerId, policyId, ruleId |

**Priority note:** Lower number = higher priority. Document this in every priority parameter description.

**Description guidance:**
- `okta_create_auth_server_policy`: "Create an access policy for an authorization server. Policies control which clients can request tokens and under what conditions. Priority determines evaluation order — lower numbers are evaluated first."
- `okta_create_policy_rule`: "Create a rule within an authorization server policy. Rules define token lifetime, scopes, and conditions (grant types, people, scopes). Priority ordering within the policy determines which rule matches first."

---

### src/tools/inline-hooks.ts — 8 tools

Export: `registerInlineHookTools(server: McpServer, client: OktaClient)`

Inline hooks are at the org level: `/inlineHooks`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_inline_hooks` | GET | `/inlineHooks` | type? (filter by hook type) |
| `okta_get_inline_hook` | GET | `/inlineHooks/{hookId}` | hookId |
| `okta_create_inline_hook` | POST | `/inlineHooks` | name, type, channel (url, method, headers) |
| `okta_update_inline_hook` | PUT | `/inlineHooks/{hookId}` | hookId, name?, channel? |
| `okta_activate_inline_hook` | POST | `/inlineHooks/{hookId}/lifecycle/activate` | hookId |
| `okta_deactivate_inline_hook` | POST | `/inlineHooks/{hookId}/lifecycle/deactivate` | hookId |
| `okta_delete_inline_hook` | DELETE | `/inlineHooks/{hookId}` | hookId — **must be deactivated first** |
| `okta_preview_inline_hook` | POST | `/inlineHooks/{hookId}/execute` | hookId, payloadData (sample event payload) |

**Hook type Zod enum:**
```typescript
z.enum([
  "com.okta.oauth2.tokens.transform",
  "com.okta.user.pre-registration",
  "com.okta.saml.tokens.transform",
  "com.okta.user.credential.password.import",
  "com.okta.import.transform"
])
```

**Description guidance:**
- `okta_preview_inline_hook`: "Test an inline hook by sending a sample payload to the configured endpoint. Returns the hook's response without triggering an actual Okta event. Use this to verify hook endpoint connectivity and response format before activating."

---

## Step 5: Install and Compile

```bash
cd /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/policy
npm install
npx tsc
```

Fix all type errors. The build must succeed with zero errors.

## Step 6: Verify Tool Count

```bash
grep -c "server.tool(" src/tools/*.ts
```

Expected total: **33 tools** (8 + 5 + 5 + 7 + 8).

## Step 7: Report

Output:
- Number of tools implemented per file
- Any compilation errors and how you fixed them
- Confirmation that tsc succeeded
