# AGENT SPEC: okta-mcp-governance

## Overview
Build the complete `okta-mcp-governance` MCP server — 21 tools covering Okta Identity Governance (IGA): certification campaigns, entitlements, bundles, and access requests.

**IMPORTANT:** This server uses `IgaClient` from `@okta-mcp/core` (NOT the base `OktaClient`). IgaClient adds the required `X-Okta-Request-Type: iga` header and uses the `/api/v1/governance` base path.

## Working Directory
`/Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/governance/`

## Prerequisites
- `@okta-mcp/core` is already built at `../core/dist/`
- Read `../../CLAUDE.md` for architecture, code patterns, and conventions
- Read `../core/src/index.ts` to see what core exports — specifically `IgaClient`

## API Reference
- IGA Overview: https://developer.okta.com/docs/api/openapi/okta-governance/
- Campaigns: https://developer.okta.com/docs/api/openapi/okta-governance/governance/tag/AccessCertificationCampaign/
- Entitlements: https://developer.okta.com/docs/api/openapi/okta-governance/governance/tag/Entitlement/
- Access Requests: https://developer.okta.com/docs/api/openapi/okta-governance/governance/tag/AccessRequest/

## IGA License Note
These endpoints require an Okta Identity Governance (IGA) add-on license. Without it, API calls return 404 or 403. Add a note about this in the server description.

---

## Step 1: Create package.json

```json
{
  "name": "okta-mcp-governance",
  "version": "0.1.0",
  "description": "Okta MCP server for Identity Governance — access reviews, entitlements, bundles, access requests",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "okta-mcp-governance": "dist/index.js"
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
import { IgaClient } from "@okta-mcp/core";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerEntitlementTools } from "./tools/entitlements.js";
import { registerBundleTools } from "./tools/bundles.js";
import { registerAccessRequestTools } from "./tools/access-requests.js";

const client = new IgaClient();
const server = new McpServer({
  name: "okta-mcp-governance",
  version: "0.1.0",
});

registerCampaignTools(server, client);
registerEntitlementTools(server, client);
registerBundleTools(server, client);
registerAccessRequestTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Note:** Uses `IgaClient` instead of `OktaClient`. The IgaClient constructor signature should match OktaClient (reads env vars). All tool handler functions receive an `IgaClient` instance.

## Step 4: Create Tool Files

Create the `src/tools/` directory and implement each file below.

---

### src/tools/campaigns.ts — 7 tools

Export: `registerCampaignTools(server: McpServer, client: IgaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_iga_list_campaigns` | GET | `/campaigns` | status?, limit?, after? |
| `okta_iga_get_campaign` | GET | `/campaigns/{campaignId}` | campaignId |
| `okta_iga_create_campaign` | POST | `/campaigns` | name, description, schedule, reviewerType, scope |
| `okta_iga_launch_campaign` | POST | `/campaigns/{campaignId}/launch` | campaignId |
| `okta_iga_close_campaign` | POST | `/campaigns/{campaignId}/close` | campaignId |
| `okta_iga_list_campaign_items` | GET | `/campaigns/{campaignId}/items` | campaignId, limit?, after? |
| `okta_iga_review_campaign_item` | POST | `/campaigns/{campaignId}/items/{itemId}/review` | campaignId, itemId, decision (APPROVED/REVOKED), justification |

**Campaign status Zod enum:**
```typescript
z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "OVERDUE", "ERROR"])
```

**Decision Zod enum:**
```typescript
z.enum(["APPROVED", "REVOKED"])
```

**Description guidance:**
- `okta_iga_review_campaign_item`: "Submit a review decision (APPROVED or REVOKED) for a certification campaign item. Justification is required for REVOKED decisions for audit compliance. Each item represents a user's access to a resource that needs periodic review."
- `okta_iga_launch_campaign`: "Launch a SCHEDULED certification campaign, making it ACTIVE. Once launched, reviewers will be notified and can begin reviewing access items. Can only be called on campaigns in SCHEDULED status."

---

### src/tools/entitlements.ts — 5 tools

Export: `registerEntitlementTools(server: McpServer, client: IgaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_iga_list_entitlements` | GET | `/entitlements` | limit?, after? |
| `okta_iga_get_entitlement` | GET | `/entitlements/{entitlementId}` | entitlementId |
| `okta_iga_list_user_entitlements` | GET | `/users/{userId}/entitlements` | userId, limit?, after? |
| `okta_iga_assign_entitlement` | POST | `/users/{userId}/entitlements` | userId, entitlementId |
| `okta_iga_revoke_entitlement` | DELETE | `/users/{userId}/entitlements/{entitlementId}` | userId, entitlementId |

Entitlements are fine-grained permissions within applications (e.g., "can approve expenses up to $10k"). They are more granular than app assignments.

---

### src/tools/bundles.ts — 4 tools

Export: `registerBundleTools(server: McpServer, client: IgaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_iga_list_bundles` | GET | `/bundles` | limit?, after? |
| `okta_iga_get_bundle` | GET | `/bundles/{bundleId}` | bundleId |
| `okta_iga_assign_bundle_to_user` | POST | `/users/{userId}/bundles` | userId, bundleId |
| `okta_iga_remove_bundle_from_user` | DELETE | `/users/{userId}/bundles/{bundleId}` | userId, bundleId |

Bundles group multiple entitlements together for role-based provisioning (e.g., "Engineering Role" = GitHub access + Jira access + AWS read-only).

---

### src/tools/access-requests.ts — 5 tools

Export: `registerAccessRequestTools(server: McpServer, client: IgaClient)`

| Tool Name | Method | Endpoint | Key Params |
|-----------|--------|----------|------------|
| `okta_iga_list_access_requests` | GET | `/requests` | status?, requesterId?, limit?, after? |
| `okta_iga_create_access_request` | POST | `/requests` | requesterId, resourceId, resourceType, justification |
| `okta_iga_approve_access_request` | POST | `/requests/{requestId}/approve` | requestId, approverNote? |
| `okta_iga_deny_access_request` | POST | `/requests/{requestId}/deny` | requestId, reason |
| `okta_iga_revoke_access_request` | POST | `/requests/{requestId}/cancel` | requestId |

**Access request status Zod enum:**
```typescript
z.enum(["PENDING", "APPROVED", "DENIED", "CANCELLED"])
```

**Description guidance:**
- `okta_iga_create_access_request`: "Create a self-service access request on behalf of a user. The request enters an approval workflow. Justification is required to explain why the access is needed."
- `okta_iga_deny_access_request`: "Deny a pending access request. A reason must be provided for the denial, which is recorded in the audit trail."

---

## Step 5: Install and Compile

```bash
cd /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/governance
npm install
npx tsc
```

Fix all type errors. The build must succeed with zero errors.

## Step 6: Verify Tool Count

```bash
grep -c "server.tool(" src/tools/*.ts
```

Expected total: **21 tools** (7 + 5 + 4 + 5).

## Step 7: Report

Output:
- Number of tools implemented per file
- Any compilation errors and how you fixed them
- Confirmation that tsc succeeded
