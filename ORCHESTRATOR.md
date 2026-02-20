# OKTA MCP PARALLEL BUILD ORCHESTRATOR

> **Single prompt. One Claude Code session. Full system.**
>
> Paste this entire file as your first message in a Claude Code session
> at the `okta-mcp/` root directory. Claude Code will build the core
> package, then dispatch 5 parallel agents to build all servers simultaneously.

---

## YOUR ROLE

You are the Build Orchestrator for the Okta MCP system. You will:
1. Build `@okta-mcp/core` directly (Phase 1)
2. Dispatch 5 parallel agents to build all MCP servers (Phase 2)
3. Run integration verification after all agents complete (Phase 3)

Read `CLAUDE.md` in this directory first — it contains the full architecture,
code patterns, and conventions that all components must follow.

---

## PHASE 1: Foundation (Execute Directly — Do Not Delegate)

Complete every step below before moving to Phase 2.

### 1.1 Update .gitignore

Ensure `.gitignore` contains:
```
.env
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

### 1.2 Build @okta-mcp/core

The core package already has `src/errors.ts` (266 error codes) and basic config.
You need to create the remaining source files. Read `CLAUDE.md` for the export
table — every export listed there must exist.

**Files to create in `packages/core/src/`:**

#### client.ts — OktaClient class
- Constructor reads `OKTA_ORG_URL` and `OKTA_API_TOKEN` from `process.env`
- Throws descriptive errors if either is missing
- Uses axios with `Authorization: SSWS {token}` header
- Base URL: `{OKTA_ORG_URL}/api/v1`
- Expose: `get()`, `post()`, `put()`, `delete()`, `patch()` convenience methods
- All methods call a central `request()` method
- Integrates backoff logic for 429 responses

#### backoff.ts — Rate limit handler
- Export a function/interceptor that handles HTTP 429
- Read `Retry-After` response header (value is in seconds)
- Wait exactly that duration, then retry
- Max 3 retries before throwing
- Log each retry attempt to stderr

#### pagination.ts — Cursor pagination
- `parseLinkHeader(linkHeader: string): { next?: string }` — parse RFC 5988 Link header
- `fetchAllPages<T>(client: OktaClient, path: string, params?: Record<string, unknown>)` — async generator that auto-follows `next` cursors

#### types.ts — Shared TypeScript interfaces
- `OktaUser`, `OktaGroup`, `OktaApp`, `OktaPolicy`
- `OktaErrorResponse`, `OktaListResponse<T>`
- `IgaEntitlement`, `IgaCampaign`, `IgaBundle`, `IgaAccessRequest`
- `AuthServer`, `OAuthScope`, `OAuthClaim`
- `OktaDevice`, `OktaEventHook`, `OktaInlineHook`

#### iga-client.ts — IGA client extension
- Wraps or extends `OktaClient`
- Adds `X-Okta-Request-Type: iga` header to every request
- Base path override: `{OKTA_ORG_URL}/api/v1/governance`

#### index.ts — Barrel export
- Re-exports everything from all src/ files
- This is the public API of `@okta-mcp/core`

### 1.3 Update Core package.json If Needed

The existing `package.json` should work. Verify `"main": "dist/index.js"` and
`"types": "dist/index.d.ts"` are set. Add `"type": "module"` and update
tsconfig module setting if using ESM, or keep commonjs — just be consistent.

### 1.4 Install Dependencies

```bash
npm install
```

Run at workspace root. This installs core's dependencies (axios, typescript).

### 1.5 Compile Core

```bash
cd packages/core && npx tsc
```

Fix ALL type errors before proceeding. The core MUST compile cleanly because
all 5 server agents will import from it.

### 1.6 Verify Core Exports

```bash
node -e "const c = require('./packages/core/dist/index.js'); console.log(Object.keys(c))"
```

Confirm these exports exist: `OktaClient`, `IgaClient`, `OktaApiError`,
`parseOktaErrorBody`, `OKTA_ERROR_CODES`, `parseLinkHeader`, `fetchAllPages`.

---

## PHASE 2: Parallel Server Dispatch

**CRITICAL: Send ALL 5 Task tool calls in a SINGLE message.**
This is what enables parallel execution.

For each agent:
- `subagent_type`: `"general-purpose"`
- `model`: `"sonnet"`
- `run_in_background`: `true`

### Agent Prompts

Use the EXACT prompt below for each agent. Only change the `{server}` name.

---

**Agent 1 — okta-mcp-users:**
```
You are building the okta-mcp-users MCP server. Read the file /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/users/AGENT.md — it contains the complete build specification. Execute EVERY step in that file:
1. Read the AGENT.md file completely first
2. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/CLAUDE.md for shared patterns
3. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/core/src/index.ts to understand core exports
4. Create all files specified in AGENT.md
5. Run npm install and npx tsc in /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/users/ to verify compilation
6. Report: total tools implemented, any compilation errors, any issues

Do NOT skip any tools. Implement every single one listed in the checklist. Every tool must have a Zod schema with .describe() on all parameters.
```

**Agent 2 — okta-mcp-apps:**
```
You are building the okta-mcp-apps MCP server. Read the file /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/apps/AGENT.md — it contains the complete build specification. Execute EVERY step in that file:
1. Read the AGENT.md file completely first
2. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/CLAUDE.md for shared patterns
3. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/core/src/index.ts to understand core exports
4. Create all files specified in AGENT.md
5. Run npm install and npx tsc in /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/apps/ to verify compilation
6. Report: total tools implemented, any compilation errors, any issues

Do NOT skip any tools. Implement every single one listed in the checklist. Every tool must have a Zod schema with .describe() on all parameters.
```

**Agent 3 — okta-mcp-governance:**
```
You are building the okta-mcp-governance MCP server. Read the file /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/governance/AGENT.md — it contains the complete build specification. Execute EVERY step in that file:
1. Read the AGENT.md file completely first
2. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/CLAUDE.md for shared patterns
3. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/core/src/index.ts to understand core exports
4. Create all files specified in AGENT.md
5. Run npm install and npx tsc in /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/governance/ to verify compilation
6. Report: total tools implemented, any compilation errors, any issues

Do NOT skip any tools. Implement every single one listed in the checklist. Every tool must have a Zod schema with .describe() on all parameters.
```

**Agent 4 — okta-mcp-policy:**
```
You are building the okta-mcp-policy MCP server. Read the file /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/policy/AGENT.md — it contains the complete build specification. Execute EVERY step in that file:
1. Read the AGENT.md file completely first
2. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/CLAUDE.md for shared patterns
3. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/core/src/index.ts to understand core exports
4. Create all files specified in AGENT.md
5. Run npm install and npx tsc in /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/policy/ to verify compilation
6. Report: total tools implemented, any compilation errors, any issues

Do NOT skip any tools. Implement every single one listed in the checklist. Every tool must have a Zod schema with .describe() on all parameters.
```

**Agent 5 — okta-mcp-admin:**
```
You are building the okta-mcp-admin MCP server. Read the file /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/admin/AGENT.md — it contains the complete build specification. Execute EVERY step in that file:
1. Read the AGENT.md file completely first
2. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/CLAUDE.md for shared patterns
3. Read /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/core/src/index.ts to understand core exports
4. Create all files specified in AGENT.md
5. Run npm install and npx tsc in /Users/craigverzosa/Documents/Work/Accounts/okta-mcp/packages/admin/ to verify compilation
6. Report: total tools implemented, any compilation errors, any issues

Do NOT skip any tools. Implement every single one listed in the checklist. Every tool must have a Zod schema with .describe() on all parameters.
```

---

### After Dispatch

Monitor all 5 background agents. When each returns:
1. Read its output
2. Note any compilation errors
3. Note any missing tools

If an agent fails, re-dispatch it (same prompt, same AGENT.md).

---

## PHASE 3: Integration Verification

Run these checks AFTER all 5 agents have completed successfully.

### 3.1 Full Compilation Check

```bash
# Type-check every package
for pkg in core users apps governance policy admin; do
  echo "=== $pkg ===" && cd packages/$pkg && npx tsc --noEmit && cd ../..
done
```

Fix any errors. If a server has type errors, read its code, fix the issue,
and re-run tsc.

### 3.2 Tool Count Audit

For each server, count the number of `server.tool(` calls and compare
against the expected count:

| Server | Expected Tools |
|--------|---------------|
| users | 26 |
| apps | 18 |
| governance | 21 |
| policy | 33 |
| admin | 25 |
| **Total** | **123** |

```bash
for pkg in users apps governance policy admin; do
  count=$(grep -r "server.tool(" packages/$pkg/src/ | wc -l)
  echo "$pkg: $count tools"
done
```

Report any server that is short.

### 3.3 Zod Schema Audit

Verify that optional Okta parameters are `.optional()` in Zod schemas.
Specifically check that `limit`, `after`, `q`, `search`, `filter` are
optional on list endpoints.

### 3.4 Description Quality Check

Every tool description must be at least 2 sentences. Flag any that are
shorter.

### 3.5 Credential Audit

```bash
# Should return NO results outside of core/src/client.ts
grep -r "SSWS " packages/ --include="*.ts" | grep -v "core/src/client"
grep -r "OKTA_API_TOKEN" packages/ --include="*.ts" | grep -v "core/src/client"
```

### 3.6 Build All

```bash
npm run build --workspaces
```

### 3.7 Generate Final Claude Desktop Config

Output the complete `claude_desktop_config.json` with absolute paths
to each server's `dist/index.js` and the env vars from `.env`.

### 3.8 Completion Report

Output a structured summary:
```
OKTA MCP BUILD REPORT
=====================
Core:        PASS/FAIL (X exports)
Users:       PASS/FAIL (X/26 tools)
Apps:        PASS/FAIL (X/18 tools)
Governance:  PASS/FAIL (X/21 tools)
Policy:      PASS/FAIL (X/33 tools)
Admin:       PASS/FAIL (X/25 tools)
Total:       X/123 tools implemented
Compilation: PASS/FAIL
Credentials: PASS/FAIL (no hardcoded secrets)
```

---

## ERROR RECOVERY

If a Phase 2 agent fails or produces incomplete output:

1. Read the agent's error output
2. Read the relevant AGENT.md for context
3. Either:
   a. Fix the issue directly in the orchestrator session, OR
   b. Re-dispatch a new agent with additional context about what failed

If Phase 3 finds type errors:
1. Read the failing file
2. Fix the error
3. Re-run tsc for that package

---

## REFERENCE: File Inventory

When complete, the repo should contain:

```
okta-mcp/
  .env                          # Okta credentials (gitignored)
  .gitignore
  CLAUDE.md                     # Project architecture reference
  ORCHESTRATOR.md               # This file
  package.json                  # Workspace root
  packages/
    core/
      package.json
      tsconfig.json
      src/
        index.ts                # Barrel export
        client.ts               # OktaClient
        backoff.ts              # 429 retry logic
        errors.ts               # Error codes (EXISTS)
        pagination.ts           # Link header pagination
        types.ts                # Shared interfaces
        iga-client.ts           # IGA header extension
      dist/                     # Compiled output
    users/
      AGENT.md
      package.json
      tsconfig.json
      src/
        index.ts
        tools/
          user-lifecycle.ts     # 13 tools
          user-relations.ts     # 3 tools
          factors.ts            # 7 tools
          sessions.ts           # 3 tools
      dist/
    apps/
      AGENT.md
      package.json
      tsconfig.json
      src/
        index.ts
        tools/
          app-management.ts     # 7 tools
          app-users.ts          # 5 tools
          app-groups.ts         # 3 tools
          app-credentials.ts    # 3 tools
      dist/
    governance/
      AGENT.md
      package.json
      tsconfig.json
      src/
        index.ts
        tools/
          campaigns.ts          # 7 tools
          entitlements.ts       # 5 tools
          bundles.ts            # 4 tools
          access-requests.ts    # 5 tools
      dist/
    policy/
      AGENT.md
      package.json
      tsconfig.json
      src/
        index.ts
        tools/
          auth-servers.ts       # 8 tools
          scopes.ts             # 5 tools
          claims.ts             # 5 tools
          auth-policies.ts      # 7 tools
          inline-hooks.ts       # 8 tools
      dist/
    admin/
      AGENT.md
      package.json
      tsconfig.json
      src/
        index.ts
        tools/
          roles.ts              # 6 tools
          system-log.ts         # 5 tools
          devices.ts            # 7 tools
          event-hooks.ts        # 7 tools
      dist/
```
