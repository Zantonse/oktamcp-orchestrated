# AGENT SPEC: okta-mcp-users

## Overview
Build the complete `okta-mcp-users` MCP server — 26 tools covering Okta Users, MFA Factors, and Sessions APIs.

## Working Directory
`/Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/users/`

## Prerequisites
- `@okta-mcp/core` is already built at `../core/dist/`
- Read `../../CLAUDE.md` for architecture, code patterns, and conventions
- Read `../core/src/index.ts` to see what core exports

## API Reference
- Users: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/
- Factors: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/UserFactor/
- Sessions: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Session/

---

## Step 1: Create package.json

```json
{
  "name": "okta-mcp-users",
  "version": "0.1.0",
  "description": "Okta MCP server for user lifecycle, MFA factors, and sessions",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "okta-mcp-users": "dist/index.js"
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

Entry point that creates the MCP server, instantiates OktaClient, registers all tool groups, and connects via stdio transport.

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OktaClient } from "@okta-mcp/core";
import { registerUserLifecycleTools } from "./tools/user-lifecycle.js";
import { registerUserRelationTools } from "./tools/user-relations.js";
import { registerFactorTools } from "./tools/factors.js";
import { registerSessionTools } from "./tools/sessions.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-users",
  version: "0.1.0",
});

registerUserLifecycleTools(server, client);
registerUserRelationTools(server, client);
registerFactorTools(server, client);
registerSessionTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Step 4: Create Tool Files

Create the `src/tools/` directory and implement each file below.

Every tool function must:
- Use `server.tool(name, description, zodSchema, handler)`
- Have a description of at least 2 sentences
- Use `.describe()` on every Zod parameter
- Return `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }`
- Handle errors by letting them propagate (core handles error formatting)

---

### src/tools/user-lifecycle.ts — 13 tools

Export: `registerUserLifecycleTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_users` | GET | `/users` | q?, search?, filter?, limit?, after? |
| `okta_get_user` | GET | `/users/{userId}` | userId (accepts id, login, or "me") |
| `okta_create_user` | POST | `/users?activate={activate}` | profile (object), credentials? (object), activate? (boolean) |
| `okta_update_user` | POST | `/users/{userId}` | userId, profile (partial object) |
| `okta_deactivate_user` | POST | `/users/{userId}/lifecycle/deactivate` | userId, sendEmail? (boolean) |
| `okta_activate_user` | POST | `/users/{userId}/lifecycle/activate` | userId, sendEmail? (boolean) |
| `okta_suspend_user` | POST | `/users/{userId}/lifecycle/suspend` | userId |
| `okta_unsuspend_user` | POST | `/users/{userId}/lifecycle/unsuspend` | userId |
| `okta_unlock_user` | POST | `/users/{userId}/lifecycle/unlock` | userId |
| `okta_expire_password` | POST | `/users/{userId}/lifecycle/expire_password` | userId |
| `okta_reset_password` | POST | `/users/{userId}/lifecycle/reset_password` | userId, sendEmail? (boolean) |
| `okta_set_password` | PUT | `/users/{userId}` | userId, credentials.password.value |
| `okta_delete_user` | DELETE | `/users/{userId}` | userId — **WARN: user must be DEPROVISIONED first. This is irreversible.** |

**Description guidance:**
- `okta_delete_user`: "Permanently delete a deprovisioned user. The user MUST be in DEPROVISIONED status first — call okta_deactivate_user before this. This operation is irreversible and cannot be undone."
- `okta_deactivate_user`: "Deactivate a user, changing their status to DEPROVISIONED. This revokes all active sessions and application assignments. Use this before okta_delete_user."
- `okta_suspend_user`: "Temporarily suspend a user without deprovisioning. Unlike deactivation, suspended users retain their app assignments. Use okta_unsuspend_user to reactivate."

---

### src/tools/user-relations.ts — 3 tools

Export: `registerUserRelationTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_get_user_groups` | GET | `/users/{userId}/groups` | userId |
| `okta_get_user_apps` | GET | `/users/{userId}/appLinks` | userId |
| `okta_get_user_roles` | GET | `/users/{userId}/roles` | userId |

These are read-only tools. Useful for auditing user access.

---

### src/tools/factors.ts — 7 tools

Export: `registerFactorTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_user_factors` | GET | `/users/{userId}/factors` | userId |
| `okta_get_factor` | GET | `/users/{userId}/factors/{factorId}` | userId, factorId |
| `okta_enroll_factor` | POST | `/users/{userId}/factors` | userId, factorType, provider, profile? |
| `okta_activate_factor` | POST | `/users/{userId}/factors/{factorId}/lifecycle/activate` | userId, factorId, passCode? |
| `okta_reset_factor` | DELETE | `/users/{userId}/factors/{factorId}` | userId, factorId — **unenrolls the factor** |
| `okta_verify_factor` | POST | `/users/{userId}/factors/{factorId}/verify` | userId, factorId, passCode? |
| `okta_list_supported_factors` | GET | `/users/{userId}/factors/catalog` | userId |

**Factor types Zod enum:**
```typescript
z.enum([
  "token:software:totp", "push", "webauthn", "email",
  "sms", "call", "token", "token:hardware", "question",
  "token:hotp", "signed_nonce"
])
```

---

### src/tools/sessions.ts — 3 tools

Export: `registerSessionTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_user_sessions` | GET | `/users/{userId}/sessions` | userId |
| `okta_revoke_user_sessions` | DELETE | `/users/{userId}/sessions` | userId — **kills ALL active sessions** |
| `okta_revoke_session` | DELETE | `/sessions/{sessionId}` | sessionId |

**Description guidance:**
- `okta_revoke_user_sessions`: "Revoke ALL active sessions for a user, forcing them to re-authenticate everywhere. Use for security incidents or when a user reports compromised credentials. For a single session, use okta_revoke_session instead."

---

## Step 5: Install and Compile

```bash
cd /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/users
npm install
npx tsc
```

Fix all type errors. The build must succeed with zero errors.

## Step 6: Verify Tool Count

```bash
grep -c "server.tool(" src/tools/*.ts
```

Expected total: **26 tools** (13 + 3 + 7 + 3).

## Step 7: Report

Output:
- Number of tools implemented per file
- Any compilation errors and how you fixed them
- Confirmation that tsc succeeded
