# Verdaccio Auth via Azure Active Directory

> Let your users authenticate into Verdaccio via Azure AD OAuth 2.0 API

---

## Install

As simple as running:

    $ npm install -g verdaccio-azure-ad-login
    
## Configure

    auth:
        azure-ad-login:
            # REQUIRED, Azure application tenant
            tenant: ""
            # REQUIRED, Azure client_id
            client_id: ""
            # REQUIRED, Azure application client_secret
            client_secret: ""
            # OPTIONAL, default email domain for accounts, example: organization.com
            organization_domain: ""
            # OPTIONAL, custom azure scope for users
            # Standard scope: user.read openid profile offline_access
            # Other permissions added here will be added to the end of the standard one
            scope: ""
            # OPTIONAL, users of these groups will be allowed to authenticate
            # This requires the App to have GroupMember.Read.All permission:
            # https://docs.microsoft.com/en-us/graph/api/user-getmembergroups?view=graph-rest-1.0&tabs=http
            allow_groups:
              - "developer"
            # OPTIONAL, authentication mode: 'ropc' (default, deprecated) or 'token' (recommended)
            auth_mode: "token"

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

## Authentication Modes

| Mode | `auth_mode` value | How it works |
|------|--------------------|--------------|
| ROPC (default, **deprecated**) | `ropc` | npm password is your Azure AD password. Microsoft is deprecating the Resource Owner Password Credentials flow. |
| Token passthrough (recommended) | `token` | npm password is a pre-issued Azure AD bearer token. Use `az account get-access-token` to generate one. |

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

Tokens are cached for 60 seconds per registry node; subsequent `npm install` calls within that window skip the `/me` validation round-trip.

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
