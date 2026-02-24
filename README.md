# Okta MCP

A suite of [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers that expose the Okta Admin API as 123 tools for AI assistants. Built with TypeScript as an npm workspace monorepo.

## Architecture

```
okta-mcp/
├── packages/core        → Shared HTTP client, error handling, pagination, types
├── packages/users       → User lifecycle, MFA factors, sessions (26 tools)
├── packages/apps        → Application management, SSO, assignments (18 tools)
├── packages/governance  → IGA: access reviews, entitlements, bundles (21 tools)
├── packages/policy      → Auth servers, OAuth2 scopes, claims, hooks (33 tools)
└── packages/admin       → Admin roles, system log, devices, event hooks (25 tools)
```

The **core** package (`@okta-mcp/core`) is a shared library — not an MCP server. It provides `OktaClient`, `IgaClient`, structured error handling, rate-limit retry, and pagination utilities. The 5 server packages each register their tools with the MCP SDK and communicate over stdio.

## Servers and Tools

### okta-mcp-users — 26 tools

User lifecycle management, MFA factor enrollment, session control, and user relationship queries.

| Category | Tools |
|----------|-------|
| User Lifecycle | `okta_list_users` `okta_get_user` `okta_create_user` `okta_update_user` `okta_activate_user` `okta_deactivate_user` `okta_suspend_user` `okta_unsuspend_user` `okta_unlock_user` `okta_delete_user` `okta_expire_password` `okta_reset_password` `okta_set_password` |
| MFA Factors | `okta_list_user_factors` `okta_get_factor` `okta_enroll_factor` `okta_activate_factor` `okta_reset_factor` `okta_verify_factor` `okta_list_supported_factors` |
| Sessions | `okta_list_user_sessions` `okta_revoke_user_sessions` `okta_revoke_session` |
| Relations | `okta_get_user_groups` `okta_get_user_apps` `okta_get_user_roles` |

### okta-mcp-apps — 18 tools

Application CRUD, user and group assignments, credential management, and SAML metadata.

| Category | Tools |
|----------|-------|
| App Management | `okta_list_apps` `okta_get_app` `okta_create_app` `okta_update_app` `okta_activate_app` `okta_deactivate_app` `okta_delete_app` |
| App Users | `okta_list_app_users` `okta_get_app_user` `okta_assign_user_to_app` `okta_update_app_user` `okta_remove_user_from_app` |
| App Groups | `okta_list_app_groups` `okta_assign_group_to_app` `okta_remove_group_from_app` |
| Credentials | `okta_list_app_keys` `okta_generate_app_key` `okta_get_app_metadata` |

### okta-mcp-governance — 21 tools

Okta Identity Governance (IGA): certification campaigns, entitlements, bundles, and self-service access requests. Requires an IGA add-on license on your Okta org.

| Category | Tools |
|----------|-------|
| Campaigns | `okta_iga_list_campaigns` `okta_iga_get_campaign` `okta_iga_create_campaign` `okta_iga_launch_campaign` `okta_iga_close_campaign` `okta_iga_list_campaign_items` `okta_iga_review_campaign_item` |
| Entitlements | `okta_iga_list_entitlements` `okta_iga_get_entitlement` `okta_iga_list_user_entitlements` `okta_iga_assign_entitlement` `okta_iga_revoke_entitlement` |
| Bundles | `okta_iga_list_bundles` `okta_iga_get_bundle` `okta_iga_assign_bundle_to_user` `okta_iga_remove_bundle_from_user` |
| Access Requests | `okta_iga_list_access_requests` `okta_iga_create_access_request` `okta_iga_approve_access_request` `okta_iga_deny_access_request` `okta_iga_revoke_access_request` |

### okta-mcp-policy — 33 tools

Authorization server management, OAuth2 scope and claim configuration, access policies, and inline hooks.

| Category | Tools |
|----------|-------|
| Auth Servers | `okta_list_auth_servers` `okta_get_auth_server` `okta_create_auth_server` `okta_update_auth_server` `okta_deactivate_auth_server` `okta_delete_auth_server` `okta_rotate_auth_server_keys` `okta_list_auth_server_keys` |
| Policies | `okta_list_auth_server_policies` `okta_create_auth_server_policy` `okta_update_auth_server_policy` `okta_delete_auth_server_policy` `okta_list_policy_rules` `okta_create_policy_rule` `okta_delete_policy_rule` |
| Scopes | `okta_list_scopes` `okta_get_scope` `okta_create_scope` `okta_update_scope` `okta_delete_scope` |
| Claims | `okta_list_claims` `okta_get_claim` `okta_create_claim` `okta_update_claim` `okta_delete_claim` |
| Inline Hooks | `okta_list_inline_hooks` `okta_get_inline_hook` `okta_create_inline_hook` `okta_update_inline_hook` `okta_activate_inline_hook` `okta_deactivate_inline_hook` `okta_delete_inline_hook` `okta_preview_inline_hook` |

### okta-mcp-admin — 25 tools

Admin role assignments, system log queries, device management, and event hook configuration.

| Category | Tools |
|----------|-------|
| Roles | `okta_list_roles` `okta_list_user_admin_roles` `okta_assign_admin_role_to_user` `okta_remove_admin_role_from_user` `okta_list_group_admin_roles` `okta_assign_admin_role_to_group` |
| System Log | `okta_get_system_log` `okta_get_system_log_events_for_user` `okta_get_system_log_events_for_app` `okta_get_system_log_failed_logins` `okta_get_system_log_admin_actions` |
| Devices | `okta_list_devices` `okta_get_device` `okta_list_device_users` `okta_deactivate_device` `okta_delete_device` `okta_suspend_device` `okta_unsuspend_device` |
| Event Hooks | `okta_list_event_hooks` `okta_create_event_hook` `okta_update_event_hook` `okta_activate_event_hook` `okta_deactivate_event_hook` `okta_delete_event_hook` `okta_verify_event_hook` |

## Prerequisites

- **Node.js** >= 18 (built against ES2022)
- **npm** >= 7 (workspace support)
- **Okta org** with admin access to create an API service app
- **Okta IGA license** (only if using the governance server)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> okta-mcp
cd okta-mcp
npm install
```

### 2. Build

Core must build first — the servers depend on it:

```bash
npm run build -w packages/core
npm run build --workspaces
```

### 3. Set up Okta credentials

Create a `.env` file in the project root:

```env
OKTA_ORG_URL=https://your-org.okta.com
OKTA_CLIENT_ID=0oa1234567890abcdef
OKTA_PRIVATE_KEY={"kty":"RSA","d":"...","n":"..."}
```

See [docs/okta-oauth-setup-guide.md](docs/okta-oauth-setup-guide.md) for the full step-by-step guide on creating the service app, generating keys, and granting scopes in the Okta admin console.

### 4. Run a server

```bash
node packages/users/dist/index.js
```

On success, you'll see on stderr:

```
[okta-mcp] Using OAuth 2.0 (client_id=0oa..., scopes=okta.users.read okta.users.manage ...)
```

The server communicates over stdio using the MCP protocol. Connect it to any MCP-compatible client.

## Authentication

Two methods are supported, auto-detected from environment variables:

| Method | Variables | Notes |
|--------|-----------|-------|
| **OAuth 2.0 service app** (recommended) | `OKTA_ORG_URL` + `OKTA_CLIENT_ID` + `OKTA_PRIVATE_KEY` | Each server requests only the scopes it needs. Tokens are short-lived and auto-refreshed. |
| **SSWS API token** (legacy) | `OKTA_ORG_URL` + `OKTA_API_TOKEN` | Token inherits the creating admin's full permissions. Not supported by IGA endpoints. |

OAuth 2.0 is recommended. See [docs/okta-oauth-setup-guide.md](docs/okta-oauth-setup-guide.md) for setup instructions.

## Claude Desktop Configuration

Add the servers to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "okta-users": {
      "command": "node",
      "args": ["/absolute/path/to/packages/users/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "your-client-id",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\"}"
      }
    },
    "okta-apps": {
      "command": "node",
      "args": ["/absolute/path/to/packages/apps/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "your-client-id",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\"}"
      }
    },
    "okta-governance": {
      "command": "node",
      "args": ["/absolute/path/to/packages/governance/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "your-client-id",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\"}"
      }
    },
    "okta-policy": {
      "command": "node",
      "args": ["/absolute/path/to/packages/policy/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "your-client-id",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\"}"
      }
    },
    "okta-admin": {
      "command": "node",
      "args": ["/absolute/path/to/packages/admin/dist/index.js"],
      "env": {
        "OKTA_ORG_URL": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "your-client-id",
        "OKTA_PRIVATE_KEY": "{\"kty\":\"RSA\",\"d\":\"...\"}"
      }
    }
  }
}
```

You can include all 5 servers or just the ones you need. Each server only requests the OAuth scopes required for its tools.

## Core Features

- **OAuth 2.0 client credentials** — signed JWT assertion, no shared secrets on the wire
- **Automatic rate-limit retry** — 429 responses are retried up to 3 times using the `Retry-After` header
- **Structured errors** — Okta error responses are parsed into `OktaApiError` with human-readable messages
- **Pagination** — every list tool supports `limit` and `after` cursor parameters; `fetchAllPages` utility for full iteration
- **Per-server scoping** — each server declares exactly the OAuth scopes it needs, limiting blast radius

## Development

```bash
# Install dependencies
npm install

# Build core (required first)
npm run build -w packages/core

# Build a specific server
npm run build -w packages/users

# Build everything
npm run build --workspaces

# Type check a package without emitting
npx tsc --noEmit -p packages/users/tsconfig.json

# Clean all build artifacts
npm run clean --workspaces
```

## License

Private — not published to npm.
