import AuthCustomPlugin from '../index';
import AzureAPI from '../AzureAPI';
import type { Logger, PackageAccess, RemoteUser, PluginOptions } from '@verdaccio/types';
import type { AzureConfig } from '../../types/AzureConfig';
import type { UnpublishPackageAccess } from '../../types/UnpublishPackageAccess';

jest.mock('../AzureAPI');

const mockApi = AzureAPI as jest.MockedClass<typeof AzureAPI>;
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  http: jest.fn(),
  child: jest.fn().mockReturnThis(),
} as unknown as Logger;

const config = {
  tenant: 'test-tenant-id',
  client_id: 'test-client-id',
  client_secret: 'test-client-secret',
  allow_groups: [],
  organization_domain: 'example.com',
  group_name_key: 'mailNickname',
} as AzureConfig;

const options = { logger: mockLogger } as unknown as PluginOptions<AzureConfig>;

function callAuthenticate(plugin: AuthCustomPlugin, user: string, password: string): Promise<string[] | false> {
  return new Promise((resolve, reject) => {
    plugin.authenticate(user, password, (err, groups) => {
      if (err) {
        reject(new Error(err.message));
      } else {
        resolve(groups as string[]);
      }
    });
  });
}

function callAllow(
  method: 'allow_access' | 'allow_publish' | 'allow_unpublish',
  plugin: AuthCustomPlugin,
  user: RemoteUser,
  pkg: PackageAccess & UnpublishPackageAccess
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    (plugin[method] as (u: RemoteUser, p: PackageAccess & UnpublishPackageAccess, cb: (err: Error | null, result: boolean) => void) => void)(user, pkg, (err: Error | null, result: boolean) => {
      if (err) {
        reject(new Error(err.message));
      } else {
        resolve(result);
      }
    });
  });
}

beforeEach(() => {
  mockApi.mockClear();
  (mockLogger.debug as jest.Mock).mockClear();
  (mockLogger.info as jest.Mock).mockClear();
  (mockLogger.warn as jest.Mock).mockClear();
  (mockLogger.error as jest.Mock).mockClear();

  mockApi.prototype.requestGroupsAppOnly = jest.fn().mockResolvedValue(['azuread', 'devs']);
  mockApi.prototype.requestToken = jest.fn().mockResolvedValue({
    access_token: 'mock-token',
    token_type: 'Bearer',
    expires_in: 3599,
    scope: 'user.read openid',
  });
  mockApi.prototype.requestUserGroups = jest.fn().mockResolvedValue(['azuread', 'devs']);
  mockApi.prototype.decodeUsernameToEmail = jest.fn().mockImplementation((u: string) => u);
  Object.defineProperty(mockApi.prototype, 'allow_groups', {
    get: jest.fn().mockReturnValue([]),
    configurable: true,
  });
  Object.defineProperty(mockApi.prototype, 'BASE_GROUPS', {
    get: jest.fn().mockReturnValue(['azuread']),
    configurable: true,
  });
  Object.defineProperty(mockApi.prototype, 'auth_mode', {
    get: jest.fn().mockReturnValue('ropc'),
    configurable: true,
  });
});

describe('AuthCustomPlugin constructor', () => {
  it('throws when a required config field is missing', () => {
    const bad = { ...config, tenant: '' } as AzureConfig;
    expect(() => new AuthCustomPlugin(bad, options)).toThrow(
      'verdaccio-azure-ad-login: Missing required config fields: tenant'
    );
  });

  it('throws listing all missing fields when multiple required fields absent', () => {
    const bad = { ...config, tenant: '', client_id: '' } as AzureConfig;
    expect(() => new AuthCustomPlugin(bad, options)).toThrow('tenant');
  });

  it('throws when ci_mode: true and auth_mode: token are both set (5-02-04)', () => {
    const bad = { ...config, ci_mode: true, auth_mode: 'token' } as AzureConfig;
    expect(() => new AuthCustomPlugin(bad, options)).toThrow(
      'ci_mode and auth_mode: token are mutually exclusive'
    );
  });
});

describe('AuthCustomPlugin.authenticate()', () => {
  let plugin: AuthCustomPlugin;

  beforeEach(() => {
    plugin = new AuthCustomPlugin(config, options);
  });

  it('resolves with userGroups when allow_groups is empty', async () => {
    const result = await callAuthenticate(plugin, 'user@example.com', 'pw');
    expect(result).toEqual(['azuread', 'devs']);
  });

  it('resolves with BASE_GROUPS + intersection when allow_groups intersects userGroups', async () => {
    Object.defineProperty(mockApi.prototype, 'allow_groups', {
      get: jest.fn().mockReturnValue(['devs']),
      configurable: true,
    });
    plugin = new AuthCustomPlugin(config, options);
    const result = await callAuthenticate(plugin, 'user@example.com', 'pw');
    expect(result).toEqual(['azuread', 'devs']);
  });

  it('rejects (cb error) when allow_groups configured but no intersection', async () => {
    Object.defineProperty(mockApi.prototype, 'allow_groups', {
      get: jest.fn().mockReturnValue(['admins']),
      configurable: true,
    });
    plugin = new AuthCustomPlugin(config, options);
    await expect(callAuthenticate(plugin, 'user@example.com', 'pw')).rejects.toThrow(
      'the user does not have enough privileges'
    );
  });

  it('rejects (cb error) when requestToken throws', async () => {
    mockApi.prototype.requestToken = jest
      .fn()
      .mockRejectedValue(new Error('Failed requesting Azure AD access token: invalid_grant'));
    plugin = new AuthCustomPlugin(config, options);
    await expect(callAuthenticate(plugin, 'user@example.com', 'badpass')).rejects.toThrow(
      'bad username/password, access denied'
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('token mode: resolves with groups when requestUserGroupsForToken succeeds', async () => {
    Object.defineProperty(mockApi.prototype, 'auth_mode', {
      get: jest.fn().mockReturnValue('token'),
      configurable: true,
    });
    mockApi.prototype.requestUserGroupsForToken = jest.fn().mockResolvedValue(['azuread', 'devs']);
    plugin = new AuthCustomPlugin(config, options);
    const result = await callAuthenticate(plugin, 'user@example.com', 'my-pat-token');
    expect(result).toEqual(['azuread', 'devs']);
  });

  it('token mode: rejects with "token is required" when password is empty', async () => {
    Object.defineProperty(mockApi.prototype, 'auth_mode', {
      get: jest.fn().mockReturnValue('token'),
      configurable: true,
    });
    plugin = new AuthCustomPlugin(config, options);
    await expect(callAuthenticate(plugin, 'user@example.com', '')).rejects.toThrow('token is required');
  });

  it('token mode: rejects with "bad username/password, access denied" when requestUserGroupsForToken throws', async () => {
    Object.defineProperty(mockApi.prototype, 'auth_mode', {
      get: jest.fn().mockReturnValue('token'),
      configurable: true,
    });
    mockApi.prototype.requestUserGroupsForToken = jest
      .fn()
      .mockRejectedValue(new Error('token does not match user'));
    plugin = new AuthCustomPlugin(config, options);
    await expect(callAuthenticate(plugin, 'user@example.com', 'bad-token')).rejects.toThrow(
      'bad username/password, access denied'
    );
  });

  it('ROPC mode: logs a deprecation warning on each authenticate call', async () => {
    plugin = new AuthCustomPlugin(config, options);
    await callAuthenticate(plugin, 'user@example.com', 'pw');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('ROPC')
    );
  });

  it('ci_mode: resolves with groups when allow_groups is empty (5-02-01)', async () => {
    mockApi.prototype.requestGroupsAppOnly = jest.fn().mockResolvedValue(['azuread', 'devs']);
    const ciPlugin = new AuthCustomPlugin({ ...config, ci_mode: true } as AzureConfig, options);
    const result = await callAuthenticate(ciPlugin, 'ci-runner@corp.com', 'ignored-password');
    expect(result).toEqual(['azuread', 'devs']);
    expect(mockApi.prototype.requestGroupsAppOnly).toHaveBeenCalledWith('ci-runner@corp.com');
  });

  it('ci_mode: rejects when no allow_groups intersection (5-02-02)', async () => {
    mockApi.prototype.requestGroupsAppOnly = jest.fn().mockResolvedValue(['azuread']);
    Object.defineProperty(mockApi.prototype, 'allow_groups', {
      get: jest.fn().mockReturnValue(['admins']),
      configurable: true,
    });
    const ciPlugin = new AuthCustomPlugin({ ...config, ci_mode: true } as AzureConfig, options);
    await expect(callAuthenticate(ciPlugin, 'ci-runner@corp.com', 'whatever')).rejects.toThrow(
      'the user does not have enough privileges'
    );
  });

  it('ci_mode: ignores password (any password accepted) (5-02-03)', async () => {
    mockApi.prototype.requestGroupsAppOnly = jest.fn().mockResolvedValue(['azuread']);
    const ciPlugin = new AuthCustomPlugin({ ...config, ci_mode: true } as AzureConfig, options);
    await expect(callAuthenticate(ciPlugin, 'ci-runner@corp.com', '')).resolves.toEqual(['azuread']);
    await expect(callAuthenticate(ciPlugin, 'ci-runner@corp.com', 'literally-anything')).resolves.toEqual(['azuread']);
  });
});

describe('AuthCustomPlugin.allow_access()', () => {
  let plugin: AuthCustomPlugin;

  beforeEach(() => {
    plugin = new AuthCustomPlugin(config, options);
  });

  it('allows when user.groups intersects pkg.access', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['devs'] } as RemoteUser;
    const pkg = { access: ['devs'] } as PackageAccess;
    await expect(callAllow('allow_access', plugin, user, pkg)).resolves.toBe(true);
  });

  it('denies when no group intersection and user.name not in pkg.access', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['outsiders'] } as RemoteUser;
    const pkg = { access: ['devs'] } as PackageAccess;
    await expect(callAllow('allow_access', plugin, user, pkg)).rejects.toThrow('not authorized to access');
  });

  it('allows when user.name is listed in pkg.access (per-user override, BUG-01 fix verification)', async () => {
    // Regression guard for BUG-01 (Phase 1) — per-user access via pkg.access.includes(user.name)
    const user = { name: 'alice', real_groups: [], groups: [] } as RemoteUser;
    const pkg = { access: ['alice'] } as PackageAccess;
    await expect(callAllow('allow_access', plugin, user, pkg)).resolves.toBe(true);
  });
});

describe('AuthCustomPlugin.allow_publish()', () => {
  let plugin: AuthCustomPlugin;

  beforeEach(() => {
    plugin = new AuthCustomPlugin(config, options);
  });

  it('allows when user.groups intersects pkg.publish', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['devs'] } as RemoteUser;
    const pkg = { publish: ['devs'] } as PackageAccess;
    await expect(callAllow('allow_publish', plugin, user, pkg)).resolves.toBe(true);
  });

  it('denies when no group intersection and user.name not in pkg.publish', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['outsiders'] } as RemoteUser;
    const pkg = { publish: ['devs'] } as PackageAccess;
    await expect(callAllow('allow_publish', plugin, user, pkg)).rejects.toThrow('not authorized to publish');
  });

  it('allows when user.name is listed in pkg.publish', async () => {
    const user = { name: 'alice', real_groups: [], groups: [] } as RemoteUser;
    const pkg = { publish: ['alice'] } as PackageAccess;
    await expect(callAllow('allow_publish', plugin, user, pkg)).resolves.toBe(true);
  });
});

describe('AuthCustomPlugin.allow_unpublish()', () => {
  let plugin: AuthCustomPlugin;

  beforeEach(() => {
    plugin = new AuthCustomPlugin(config, options);
  });

  it('allows when user.groups intersects pkg.unpublish', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['devs'] } as RemoteUser;
    const pkg = { unpublish: ['devs'] } as PackageAccess & UnpublishPackageAccess;
    await expect(callAllow('allow_unpublish', plugin, user, pkg)).resolves.toBe(true);
  });

  it('denies when no group intersection and user.name not in pkg.unpublish', async () => {
    const user = { name: 'alice', real_groups: [], groups: ['outsiders'] } as RemoteUser;
    const pkg = { unpublish: ['devs'] } as PackageAccess & UnpublishPackageAccess;
    await expect(callAllow('allow_unpublish', plugin, user, pkg)).rejects.toThrow('not authorized to unpublish');
  });

  it('allows when user.name is listed in pkg.unpublish', async () => {
    const user = { name: 'alice', real_groups: [], groups: [] } as RemoteUser;
    const pkg = { unpublish: ['alice'] } as PackageAccess & UnpublishPackageAccess;
    await expect(callAllow('allow_unpublish', plugin, user, pkg)).resolves.toBe(true);
  });
});
