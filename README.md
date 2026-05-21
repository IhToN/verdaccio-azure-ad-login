# Verdaccio Auth via Azure Active Directory

> Let your users authenticate into Verdaccio via Azure AD OAuth 2.0 API

---

## Install

As simple as running:

    $ npm install -g verdaccio-azure-ad-login
    
## Configure

### Auth plugin

The `auth:` section handles `npm login` authentication:

```yaml
auth:
  azure-ad-login:
    # REQUIRED
    tenant: ""
    client_id: ""
    client_secret: ""
    # OPTIONAL — default email domain, lets users log in with the local part only
    organization_domain: ""
    # OPTIONAL — extra scopes appended to the default (user.read openid profile offline_access)
    scope: ""
    # OPTIONAL — restrict login to these Azure AD groups (requires GroupMember.Read.All permission)
    allow_groups:
      - "developer"
    # OPTIONAL — which group object field to use as the group name (default: mailNickname)
    group_name_key: ""
    # OPTIONAL — authentication mode: 'ropc' (default, deprecated), 'token' (recommended), or 'auto'
    auth_mode: "token"
    # OPTIONAL — use app-only credentials for group lookup; npm password is ignored
    ci_mode: false
```

### Middleware plugin

The `middlewares:` section enables the browser-based login UI (`/-/auth/azure`).
Only needed if you want browser login in addition to `npm login`.
Each section carries its own independent Azure AD app registration — the middleware can use
a different app than the auth section if needed.

```yaml
middlewares:
  azure-ad-login:
    enabled: true
    # REQUIRED — Azure AD app credentials for the browser OAuth flow
    tenant: "your-tenant-id"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    # REQUIRED — must match the redirect URI registered in the Azure AD app
    redirect_uri: "https://your.registry.local/-/auth/azure/callback"
    # OPTIONAL — restrict browser login to these Azure AD groups
    allow_groups:
      - "developer"
```

## Logging In

To log in using NPM, run:

```
    npm adduser --registry  https://your.registry.local
```

As the username for Azure ActiveDirectory is the email addresses and cannot contain `@`, replace the `@` with two periods `..`\
Example: `usermail..organization.com`

The address will be parsed and converted to a normal email address for authentication.

You can specify the `organization_domain` if most or all of your users use the same email provider or an own mail server. In this case users will be able to log in using its local part (or id) from the mail as username, being able to override the default domain via the `..` convention mentioned previously.\
Example:

```
auth:
    azure-ad-login:
        organization_domain: 'organization.com'
```

User example email: `own_email@organization.com`\
Local part: `own_email`\
The user will be able to log in using `own_email` as the npm username.

## Browser Login Setup

The plugin ships with a browser-based Azure AD login UI. Users visit `/-/auth/azure`, sign in via
Azure AD, and receive a page showing their access token and the exact `npm config set` command to
authenticate their npm client.

### 1 — Verdaccio configuration

Add `azure-ad-login` under both `auth:` and `middlewares:`. Each section carries its own
independent credentials — you can use the same app registration or different ones:

```yaml
auth:
  azure-ad-login:
    tenant: "your-tenant-id"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    # Recommended when using browser login so tokens issued by the browser flow are accepted
    auth_mode: "token"

middlewares:
  azure-ad-login:
    enabled: true
    tenant: "your-tenant-id"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    redirect_uri: "https://your.registry.local/-/auth/azure/callback"
```

### 2 — Azure AD app registration

In the Azure portal, open your app registration and add the callback URL as a **Web** redirect URI:

```
https://your.registry.local/-/auth/azure/callback
```

The application needs the following Microsoft Graph **delegated** permissions:
- `openid`, `profile`, `User.Read` (for browser login)
- `GroupMember.Read.All` or `Group.Read.All` if `allow_groups` is configured (requires admin consent)

### 3 — How it works

1. User visits `https://your.registry.local/-/auth/azure`
2. Browser redirects to Azure AD login with PKCE parameters
3. After sign-in, Azure AD redirects back to `/-/auth/azure/callback`
4. The plugin validates the CSRF state, exchanges the code for tokens, checks group membership, and renders a result page
5. User copies the `npm config set` command and runs it in their terminal

> **auth_mode requirement:** The access token issued by the browser flow is an Azure AD bearer token.
> For `npm install` and `npm publish` to work after browser login, `auth_mode` must be set to `"token"`
> or `"auto"` in the `auth:` config block. The default `"ropc"` mode will not accept browser-issued tokens.

## Authentication Modes

| Mode | `auth_mode` value | How it works |
|------|--------------------|--------------|
| ROPC (default, **deprecated**) | `ropc` | npm password is your Azure AD password. Microsoft is deprecating the Resource Owner Password Credentials flow. |
| Token passthrough (recommended) | `token` | npm password is a pre-issued Azure AD bearer token. Use `az account get-access-token` to generate one. |
| Auto-detect | `auto` | npm password is inspected at login time. If it starts with `eyJ`, has 3 dot-separated segments, and the first segment decodes to a JSON JWT header (`typ` or `alg`), it is treated as a bearer token (same as `token` mode). Otherwise it is treated as a password and routed to ROPC (with the usual deprecation warning). Omitting `auth_mode` still defaults to `ropc` — `auto` must be set explicitly. |
| CI Mode (app-only) | `ci_mode: true` | npm password is ignored. The plugin uses the app registration's own credentials (client credentials grant) to acquire a Graph token and look up the user's Azure AD group memberships by UPN. |

> **`auth_mode: auto` and the JWT-shaped-password edge case:** see [Auto Mode Edge Cases](#auto-mode-edge-cases) below.

**Migrating to token mode:**

1. Set `auth_mode: token` in your verdaccio config.
2. Obtain a token via the Azure CLI:

```bash
az account get-access-token --resource 00000003-0000-0000-c000-000000000002 --query accessToken -o tsv
```

3. Use the token as your npm password:

```bash
npm login --registry https://your.registry.local
# Username: your.name@organization.com
# Password: <paste token from step 2>
```

**CI/CD pipelines:** If you need non-interactive authentication for build agents, use `ci_mode: true` instead — the plugin authenticates with the app registration's own credentials and looks up group memberships by UPN. See [CI/CD Authentication](#cicd-authentication) below.

Tokens are cached for 60 seconds per registry node; subsequent `npm install` calls within that window skip the `/me` validation round-trip.

## CI/CD Authentication

When `ci_mode: true` is set, authentication uses the client_credentials grant — the plugin acquires a Graph token using the app registration's own credentials and looks up group memberships by UPN. The npm password is ignored entirely. To use this mode, you must grant the Azure AD application permission documented below.

### Azure AD Setup

1. In the Azure portal, navigate to **App registrations** → your app → **API permissions**.
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**.
3. Search for and add **Directory.Read.All**.
4. Click **Grant admin consent** for the tenant (required — application permissions are not granted by user consent).

### Verdaccio Config

```yaml
auth:
  azure-ad-login:
    tenant: "<tenant-id>"
    client_id: "<client-id>"
    client_secret: "<client-secret>"
    organization_domain: "<domain>"
    allow_groups:
      - "<group-name>"
    group_name_key: displayName
    ci_mode: true
```

### npm login in CI

In `ci_mode`, the UPN (username) is used for Azure AD group lookup. The npm password / `.npmrc` token value is not validated against Azure AD — any non-empty string is accepted.

```bash
npm set //<registry-url>/:_authToken "ci-placeholder"
```

Equivalent GitHub Actions step:

```yaml
- name: Authenticate with Verdaccio
  run: npm set //${{ vars.REGISTRY_URL }}/:_authToken ${{ secrets.REGISTRY_TOKEN }}
```

> In `ci_mode`, the token value is not validated against Azure AD. Access control is group-based: the plugin looks up the username's Azure AD group membership using the app-only credentials.

## Auto Mode Edge Cases

### JWT-shaped password misroute

When `auth_mode: auto` is set, the plugin inspects each password at login time using a heuristic: a password is treated as a bearer token if it starts with `eyJ`, has exactly three dot-separated segments, and the first segment base64-decodes to a JSON object containing `typ` or `alg`.

A password that happens to match this shape — for example, a legacy internal password that begins with `eyJ` and contains exactly two dots — will be routed to token validation flow rather than ROPC, causing the login to fail with an invalid-token error rather than an incorrect-password error.

**Resolution:** Set `auth_mode: ropc` explicitly in your verdaccio config to bypass the heuristic entirely:

```yaml
auth:
  azure-ad-login:
    auth_mode: ropc
```

### Missing `organization_domain` warning

When `auth_mode: auto` is set without `organization_domain`, Verdaccio emits a startup `warn` log:

```
verdaccio-azure-ad-login: auth_mode: auto with no organization_domain — bare usernames cannot be normalized for the ROPC path
```

Bare usernames (those without `@` or `..`) cannot be converted to an email address for the ROPC path. If a user logs in with a bare username and the heuristic routes to ROPC, the authentication will fail.

**Resolution:** Add `organization_domain` to your config, or use `auth_mode: token` exclusively if all your users will always supply bearer tokens.

## How does it work?

User provides a login/password which he uses to perform auth on Azure ActiveDirectory. Verdaccio will grant access to the user only if he is in at least one of the groups from the "allow_groups" option.

This option provides a way to specify which teams and their roles should be authorized by Verdaccio. If team name is set without roles it would be treated as any role grants a successful sign in for the user. Controversial, if roles are specified within the team, Verdaccio will check if signed user has an appropriate role in the team.

After this it is becomes possible to configure team-based access.


## Package Access

By default, all users connected using Azure AD will be a member of _azuread_ group.

```
packages:
  '**':
    access: $all
    publish: azuread # only Azure AD authenticated members will be allow to publish
```
