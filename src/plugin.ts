import type {
  PluginOptions,
  AuthCallback,
  IPluginAuth,
  Logger,
  RemoteUser,
  PackageAccess,
  AuthAccessCallback,
} from '@verdaccio/types';
import { getUnauthorized } from '@verdaccio/commons-api';

import type { AzureConfig } from '../types/AzureConfig';
import type { UnpublishPackageAccess } from '../types/UnpublishPackageAccess';

import AzureAPI from './AzureAPI';
import { intersection } from './helpers';
import { dispatchAuth } from './auth/dispatcher';
import { allowAccess, allowPublish, allowUnpublish } from './auth/acl';

export default class AuthCustomPlugin implements IPluginAuth<AzureConfig> {
  public logger: Logger;
  public api: AzureAPI;
  private readonly ciMode: boolean;

  public constructor(config: AzureConfig, options: PluginOptions<AzureConfig>) {
    this.logger = options.logger;

    const missing = (['tenant', 'client_id', 'client_secret'] as const).filter(
      (key) => !config[key] || config[key].trim() === ''
    );
    if (missing.length > 0) {
      throw new Error(`verdaccio-azure-ad-login: Missing required config fields: ${missing.join(', ')}`);
    }

    const rawMode = config.auth_mode as string | undefined;
    if (rawMode !== undefined && rawMode !== 'ropc' && rawMode !== 'token' && rawMode !== 'auto') {
      throw new Error(`verdaccio-azure-ad-login: Unknown auth_mode '${rawMode}'; expected 'ropc', 'token', or 'auto'`);
    }

    if (config.ci_mode && (config.auth_mode === 'token' || config.auth_mode === 'auto')) {
      throw new Error(
        'verdaccio-azure-ad-login: ci_mode is mutually exclusive with auth_mode: token and auth_mode: auto. ' +
        'Use ci_mode for app-only authentication, or set auth_mode explicitly for user-credential flows.'
      );
    }

    if (config.auth_mode === 'auto' && !config.organization_domain) {
      this.logger.warn(
        {},
        'verdaccio-azure-ad-login: auth_mode: auto with no organization_domain — bare usernames cannot be normalized for the ROPC path'
      );
    }

    if (!config.redirect_uri) {
      this.logger.warn(
        {},
        'verdaccio-azure-ad-login: redirect_uri is not set — browser login (register_middlewares) will not work'
      );
    }

    this.ciMode = config.ci_mode ?? false;

    this.logger.info(
      {
        tenant: config.tenant,
        client_id: config.client_id,
        client_secret: '***',
        allow_groups: config.allow_groups?.length ? config.allow_groups : undefined,
        auth_mode: config.auth_mode ?? 'ropc',
        ci_mode: config.ci_mode ?? false,
      },
      'verdaccio-azure-ad-login: config loaded'
    );

    this.api = new AzureAPI(config);
    return this;
  }

  // todo: customize error message for addUser

  public authenticate(user: string, password: string, cb: AuthCallback): void {
    this.logger.debug({ user }, 'Trying to authenticate: @{user}');

    if (!this.ciMode && this.api.auth_mode === 'token' && password.trim() === '') {
      cb(getUnauthorized('token is required'), false);
      return;
    }
    if (!this.ciMode && this.api.auth_mode === 'auto' && !password.trim()) {
      cb(getUnauthorized('bad username/password, access denied'), false);
      return;
    }

    void (async () => {
      try {
        const userGroups = await dispatchAuth(this.api, user, password, this.logger, this.ciMode);
        const policy = this.applyGroupPolicy(userGroups);
        if (policy === null) {
          cb(getUnauthorized('the user does not have enough privileges'), false);
        } else {
          cb(null, policy.groups);
        }
      } catch (error) {
        this.logger.error({ error }, 'Error authentication in Azure >> @{error}');
        cb(getUnauthorized('bad username/password, access denied'), false);
      }
    })();
  }

  private applyGroupPolicy(userGroups: string[]): { groups: string[] } | null {
    if (this.api.allow_groups.length === 0) {
      return { groups: userGroups };
    }
    const groupsIntersection = intersection(userGroups, this.api.allow_groups);
    this.logger.debug(
      { groupsIntersection },
      'Intersection between User Groups and Allowed Groups >> @{groupsIntersection}'
    );
    if (groupsIntersection.length > 0) {
      return { groups: Array.from(new Set([...this.api.BASE_GROUPS, ...groupsIntersection])) };
    }
    return null;
  }

  public allow_access(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
    allowAccess(user, pkg, cb, this.logger);
  }

  public allow_publish(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
    allowPublish(user, pkg, cb, this.logger);
  }

  public allow_unpublish(user: RemoteUser, pkg: PackageAccess & UnpublishPackageAccess, cb: AuthAccessCallback): void {
    allowUnpublish(user, pkg, cb, this.logger);
  }
}
