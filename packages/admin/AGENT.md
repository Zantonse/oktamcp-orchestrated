# AGENT SPEC: okta-mcp-admin

## Overview
Build the complete `okta-mcp-admin` MCP server — 25 tools covering Okta Admin Roles, System Log (audit), Device management, and Event Hooks.

## Working Directory
`/Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/admin/`

## Prerequisites
- `@okta-mcp/core` is already built at `../core/dist/`
- Read `../../CLAUDE.md` for architecture, code patterns, and conventions
- Read `../core/src/index.ts` to see what core exports

## API Reference
- Roles: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/RoleAssignment/
- System Log: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/SystemLog/
- Devices: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Device/
- Event Hooks: https://developer.okta.com/docs/api/openapi/okta-management/management/tag/EventHook/

---

## Step 1: Create package.json

```json
{
  "name": "okta-mcp-admin",
  "version": "0.1.0",
  "description": "Okta MCP server for admin roles, system log, devices, and event hooks",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "okta-mcp-admin": "dist/index.js"
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
import { registerRoleTools } from "./tools/roles.js";
import { registerSystemLogTools } from "./tools/system-log.js";
import { registerDeviceTools } from "./tools/devices.js";
import { registerEventHookTools } from "./tools/event-hooks.js";

const client = new OktaClient();
const server = new McpServer({
  name: "okta-mcp-admin",
  version: "0.1.0",
});

registerRoleTools(server, client);
registerSystemLogTools(server, client);
registerDeviceTools(server, client);
registerEventHookTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Step 4: Create Tool Files

Create the `src/tools/` directory and implement each file below.

---

### src/tools/roles.ts — 6 tools

Export: `registerRoleTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_roles` | GET | `/iam/roles` | limit?, after? |
| `okta_list_user_admin_roles` | GET | `/users/{userId}/roles` | userId |
| `okta_assign_admin_role_to_user` | POST | `/users/{userId}/roles` | userId, type (roleType enum) |
| `okta_remove_admin_role_from_user` | DELETE | `/users/{userId}/roles/{roleId}` | userId, roleId |
| `okta_list_group_admin_roles` | GET | `/groups/{groupId}/roles` | groupId |
| `okta_assign_admin_role_to_group` | POST | `/groups/{groupId}/roles` | groupId, type (roleType enum) |

**Admin role type Zod enum:**
```typescript
z.enum([
  "SUPER_ADMIN", "ORG_ADMIN", "APP_ADMIN", "USER_ADMIN",
  "HELP_DESK_ADMIN", "READ_ONLY_ADMIN", "MOBILE_ADMIN",
  "API_ACCESS_MANAGEMENT_ADMIN", "REPORT_ADMIN",
  "GROUP_MEMBERSHIP_ADMIN"
])
```

**Description guidance:**
- `okta_assign_admin_role_to_user`: "Assign an administrative role to a user. WARNING: SUPER_ADMIN grants complete control over the entire Okta org, including the ability to create/delete other admins. Use the principle of least privilege — prefer USER_ADMIN or HELP_DESK_ADMIN for most use cases."
- `okta_assign_admin_role_to_group`: "Assign an administrative role to all members of a group. Every user in the group receives the role. WARNING: Be extremely careful with SUPER_ADMIN — it gives full org control to all group members."

---

### src/tools/system-log.ts — 5 tools

Export: `registerSystemLogTools(server: McpServer, client: OktaClient)`

**IMPORTANT:** System log uses the `after` cursor for pagination (from Link header), NOT offset. Default limit is 100, max is 1000 per request. Okta retains logs for 90 days.

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_get_system_log` | GET | `/logs` | since? (ISO 8601), until? (ISO 8601), filter?, q? (keyword), limit? (max 1000), sortOrder? (ASCENDING/DESCENDING), after? |
| `okta_get_system_log_events_for_user` | GET | `/logs` | userId — builds filter: `actor.id eq "{userId}"`. Also accepts since?, until?, limit? |
| `okta_get_system_log_events_for_app` | GET | `/logs` | appId — builds filter: `target.id eq "{appId}" and target.type eq "AppInstance"`. Also accepts since?, until?, limit? |
| `okta_get_system_log_failed_logins` | GET | `/logs` | hoursAgo (number, default 24) — builds filter: `eventType eq "user.session.start" and outcome.result eq "FAILURE"` with since = now - hoursAgo |
| `okta_get_system_log_admin_actions` | GET | `/logs` | since?, until?, limit? — builds filter: `eventType sw "user.account"` |

**Filter expression syntax (Okta-specific, not SCIM):**
```
actor.id eq "userId"
eventType eq "user.session.start"
eventType sw "user.account"
outcome.result eq "FAILURE"
target.id eq "appId" and target.type eq "AppInstance"
```

**sortOrder Zod enum:**
```typescript
z.enum(["ASCENDING", "DESCENDING"])
```

**Description guidance:**
- `okta_get_system_log`: "Query the Okta system log for audit events. Supports filter expressions, keyword search, date ranges, and pagination. Use 'since' and 'until' (ISO 8601 format) to narrow results. Filter uses Okta expression syntax (e.g., eventType eq \"user.session.start\"). Okta retains logs for 90 days."
- `okta_get_system_log_failed_logins`: "Get failed login attempts from the system log within a recent time window. Defaults to the last 24 hours. Useful for security investigations and detecting brute-force attempts."

---

### src/tools/devices.ts — 7 tools

Export: `registerDeviceTools(server: McpServer, client: OktaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_devices` | GET | `/devices` | search? (SCIM filter), limit?, after? |
| `okta_get_device` | GET | `/devices/{deviceId}` | deviceId |
| `okta_list_device_users` | GET | `/devices/{deviceId}/users` | deviceId |
| `okta_deactivate_device` | POST | `/devices/{deviceId}/lifecycle/deactivate` | deviceId |
| `okta_delete_device` | DELETE | `/devices/{deviceId}` | deviceId — **WARN: permanent, cannot be undone** |
| `okta_suspend_device` | POST | `/devices/{deviceId}/lifecycle/suspend` | deviceId |
| `okta_unsuspend_device` | POST | `/devices/{deviceId}/lifecycle/unsuspend` | deviceId |

**Device status flow:** ACTIVE → SUSPENDED (temporary) or DEACTIVATED (permanent-ish) → DELETE (irreversible)

**Description guidance:**
- `okta_delete_device`: "Permanently remove a device record from Okta. This is irreversible — the device will need to re-enroll through the Okta Verify registration flow. Use okta_deactivate_device or okta_suspend_device for temporary actions."
- `okta_suspend_device`: "Temporarily suspend a device. Unlike deactivation, suspended devices can be quickly restored with okta_unsuspend_device. Use for temporary investigations or policy enforcement."

---

### src/tools/event-hooks.ts — 7 tools

Export: `registerEventHookTools(server: McpServer, client: OktaClient)`

Event hooks are different from inline hooks. Event hooks are asynchronous (fire-and-forget) notifications sent to an external URL when specific Okta events occur. Inline hooks (in the policy server) are synchronous and can modify the Okta flow.

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_list_event_hooks` | GET | `/eventHooks` | — |
| `okta_create_event_hook` | POST | `/eventHooks` | name, events (object with type and items[]), channel (object with type, version, config with uri, headers?, authScheme?) |
| `okta_update_event_hook` | PUT | `/eventHooks/{eventHookId}` | eventHookId, name?, events?, channel? |
| `okta_activate_event_hook` | POST | `/eventHooks/{eventHookId}/lifecycle/activate` | eventHookId |
| `okta_deactivate_event_hook` | POST | `/eventHooks/{eventHookId}/lifecycle/deactivate` | eventHookId |
| `okta_delete_event_hook` | DELETE | `/eventHooks/{eventHookId}` | eventHookId — **must be deactivated first** |
| `okta_verify_event_hook` | POST | `/eventHooks/{eventHookId}/lifecycle/verify` | eventHookId |

**Event hook events items example:**
```json
{
  "type": "EVENT_TYPE",
  "items": ["user.lifecycle.create", "user.lifecycle.activate", "user.session.start"]
}
```

**Description guidance:**
- `okta_verify_event_hook`: "Trigger ownership verification for an event hook. Okta sends a one-time verification request to the hook endpoint. The endpoint must respond with the verification value. This must be called after creating a hook before it will receive events."
- `okta_create_event_hook`: "Create an event hook that sends asynchronous notifications to an external URL when specified Okta events occur. After creation, call okta_verify_event_hook to complete ownership verification before the hook becomes active."

---

## Step 5: Install and Compile

```bash
cd /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/admin
npm install
npx tsc
```

Fix all type errors. The build must succeed with zero errors.

## Step 6: Verify Tool Count

```bash
grep -c "server.tool(" src/tools/*.ts
```

Expected total: **25 tools** (6 + 5 + 7 + 7).

## Step 7: Report

Output:
- Number of tools implemented per file
- Any compilation errors and how you fixed them
- Confirmation that tsc succeeded
