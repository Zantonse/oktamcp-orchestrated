# AGENT SPEC: okta-mcp-apps

## Overview
Build the complete `okta-mcp-apps` MCP server — 18 tools covering Okta Application management, user/group assignments, and credentials/keys.

## Working Directory
`/Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/apps/`

## Prerequisites
- `@okta-mcp/core` is already built at `../core/dist/`
- Read `../../CLAUDE.md` for architecture, code patterns, and conventions
- Read `../core/src/index.ts` to see what core exports

## API Reference
- Apps: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Application/
- App Users: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/ApplicationUsers/
- App Groups: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/ApplicationGroups/

---

## Step 1: Create package.json

```json
{
  "name": "okta-mcp-apps",
  "version": "0.1.0",
  "description": "Okta MCP server for application management, SSO config, and assignments",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "okta-mcp-apps": "dist/index.js"
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
import { registerAppManagementTools } from "./tools/app-management.js";
import { registerAppUserTools } from "./tools/app-users.js";
import { registerAppGroupTools } from "./tools/app-groups.js";
import { registerAppCredentialTools } from "./tools/app-credentials.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-apps",
  version: "0.1.0",
});

registerAppManagementTools(server, client);
registerAppUserTools(server, client);
registerAppGroupTools(server, client);
registerAppCredentialTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Step 4: Create Tool Files

Create the `src/tools/` directory and implement each file below.

---

### src/tools/app-management.ts — 7 tools

Export: `registerAppManagementTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_apps` | GET | `/apps` | q? (label search), filter? (status eq "ACTIVE"), limit?, after? |
| `okta_get_app` | GET | `/apps/{appId}` | appId |
| `okta_create_app` | POST | `/apps` | label, signOnMode, settings? (use z.record for app-specific settings) |
| `okta_update_app` | PUT | `/apps/{appId}` | appId, label?, signOnMode?, settings? |
| `okta_activate_app` | POST | `/apps/{appId}/lifecycle/activate` | appId |
| `okta_deactivate_app` | POST | `/apps/{appId}/lifecycle/deactivate` | appId |
| `okta_delete_app` | DELETE | `/apps/{appId}` | appId — **WARN: app must be INACTIVE first** |

**signOnMode Zod enum:**
```typescript
z.enum([
  "SAML_2_0", "OPENID_CONNECT", "BOOKMARK", "AUTO_LOGIN",
  "BASIC_AUTH", "BROWSER_PLUGIN", "SECURE_PASSWORD_STORE",
  "WS_FEDERATION", "SWA"
])
```

**Description guidance:**
- `okta_delete_app`: "Permanently delete an application. The app MUST be deactivated first — call okta_deactivate_app before this. This removes all user and group assignments."
- `okta_create_app`: "Create a new application in Okta. The signOnMode determines the authentication type (SAML_2_0, OPENID_CONNECT, etc.). Use z.record for app-specific settings as they vary by signOnMode."

---

### src/tools/app-users.ts — 5 tools

Export: `registerAppUserTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_app_users` | GET | `/apps/{appId}/users` | appId, limit?, after? |
| `okta_get_app_user` | GET | `/apps/{appId}/users/{userId}` | appId, userId |
| `okta_assign_user_to_app` | POST | `/apps/{appId}/users` | appId, id (userId), profile? (app-specific attrs) |
| `okta_update_app_user` | POST | `/apps/{appId}/users/{userId}` | appId, userId, profile (app-level user profile) |
| `okta_remove_user_from_app` | DELETE | `/apps/{appId}/users/{userId}` | appId, userId |

App-level user profiles vary per application type. Use `z.record(z.unknown())` for the profile parameter.

---

### src/tools/app-groups.ts — 3 tools

Export: `registerAppGroupTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_app_groups` | GET | `/apps/{appId}/groups` | appId, limit?, after? |
| `okta_assign_group_to_app` | PUT | `/apps/{appId}/groups/{groupId}` | appId, groupId, priority? (number), profile? |
| `okta_remove_group_from_app` | DELETE | `/apps/{appId}/groups/{groupId}` | appId, groupId |

**Note:** Priority field controls which group mapping wins when a user belongs to multiple groups assigned to the same app. Lower number = higher priority.

---

### src/tools/app-credentials.ts — 3 tools

Export: `registerAppCredentialTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_app_keys` | GET | `/apps/{appId}/credentials/keys` | appId |
| `okta_generate_app_key` | POST | `/apps/{appId}/credentials/keys/generate` | appId, validityYears? (number) |
| `okta_get_app_metadata` | GET | `/apps/{appId}/sso/saml/metadata` | appId — returns SAML metadata XML URL |

**Description guidance:**
- `okta_generate_app_key`: "Generate a new signing key credential for an application. For SAML apps, this rotates the signing certificate. WARNING: rotating keys may break existing SSO integrations until the new certificate is shared with the service provider."

---

## Step 5: Install and Compile

```bash
cd /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/apps
npm install
npx tsc
```

Fix all type errors. The build must succeed with zero errors.

## Step 6: Verify Tool Count

```bash
grep -c "server.tool(" src/tools/*.ts
```

Expected total: **18 tools** (7 + 5 + 3 + 3).

## Step 7: Report

Output:
- Number of tools implemented per file
- Any compilation errors and how you fixed them
- Confirmation that tsc succeeded
