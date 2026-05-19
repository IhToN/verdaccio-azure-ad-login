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

/**
 * Custom Verdaccio Authenticate Plugin.
 */
export default class AuthCustomPlugin implements IPluginAuth<AzureConfig> {
  public logger: Logger;
  public api: AzureAPI;
  private readonly ciMode: boolean;

  public constructor(config: AzureConfig, options: PluginOptions<AzureConfig>) {
    this.logger = options.logger;

    // Validate required fields — fail at startup, not at first login (D-02, D-03, D-04)
    const missing = (['tenant', 'client_id', 'client_secret'] as const).filter(
      (key) => !config[key] || config[key].trim() === ''
    );
    if (missing.length > 0) {
      throw new Error(`verdaccio-azure-ad-login: Missing required config fields: ${missing.join(', ')}`);
    }

    const rawMode = config.auth_mode as string | undefined;
    if (rawMode !== undefined && rawMode !== 'ropc' && rawMode !== 'token') {
      throw new Error(`verdaccio-azure-ad-login: Unknown auth_mode '${rawMode}'; expected 'ropc' or 'token'`);
    }

    if (config.ci_mode && config.auth_mode === 'token') {
      throw new Error(
        'verdaccio-azure-ad-login: ci_mode and auth_mode: token are mutually exclusive. ' +
        'Use ci_mode for app-only authentication or auth_mode: token for PAT passthrough.'
      );
    }

    this.ciMode = config.ci_mode ?? false;

    // Startup config log — operational visibility with secret redacted (FEAT-02 / Discretion)
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

  /**
   * Authenticate an user.
   * @param user user to log
   * @param password provided password
   * @param cb callback function
   */
  public authenticate(user: string, password: string, cb: AuthCallback): void {
    this.logger.debug({ user }, 'Trying to authenticate: @{user}');

    void (async () => {
      try {
        if (this.ciMode) {
          const groups = await this.api.requestGroupsAppOnly(
            this.api.decodeUsernameToEmail(user)
          );
          this.logger.debug({ groups }, 'CI mode user groups >> @{groups}');
          const ciPolicy = this.applyGroupPolicy(groups);
          if (ciPolicy === null) {
            cb(getUnauthorized('the user does not have enough privileges'), false);
            return;
          } else {
            cb(null, ciPolicy.groups);
            return;
          }
        }

        const mode = this.api.auth_mode;
        switch (mode) {
          case 'ropc': {
            this.logger.warn(
              {},
              'verdaccio-azure-ad-login: ROPC auth mode is deprecated; migrate to auth_mode: token using az account get-access-token'
            );
            const token = await this.api.requestToken(this.api.decodeUsernameToEmail(user), password);
            this.logger.debug({ token }, 'MS Token Received >> @{token}');
            const userGroups = await this.api.requestUserGroups(token.access_token);
            this.logger.debug({ userGroups }, 'User is member of these groups >> @{userGroups}');
            const ropcPolicy = this.applyGroupPolicy(userGroups);
            if (ropcPolicy === null) {
              cb(getUnauthorized('the user does not have enough privileges'), false);
            } else {
              cb(null, ropcPolicy.groups);
            }
            break;
          }
          case 'token': {
            if (password.trim() === '') {
              cb(getUnauthorized('token is required'), false);
              return;
            }
            const groups = await this.api.requestUserGroupsForToken(
              password,
              this.api.decodeUsernameToEmail(user)
            );
            this.logger.debug({ groups }, 'User is member of these groups >> @{groups}');
            const tokenPolicy = this.applyGroupPolicy(groups);
            if (tokenPolicy === null) {
              cb(getUnauthorized('the user does not have enough privileges'), false);
            } else {
              cb(null, tokenPolicy.groups);
            }
            break;
          }
          default: {
            cb(getUnauthorized('unknown auth_mode'), false);
          }
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

  /**
   * Triggered on each access request
   * @param user
   * @param pkg
   * @param cb
   */
  public allow_access(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
    const groupsIntersection = intersection(user.groups, pkg?.access || []);
    if (pkg?.access?.includes(user.name ?? '') || groupsIntersection.length > 0) {
      this.logger.debug({ name: user.name }, '@{name} has been granted to access');
      cb(null, true);
    } else {
      this.logger.error({ name: user.name }, '@{name} is not allowed to access this package');
      cb(getUnauthorized('not authorized to access this package'), false);
    }
  }

  /**
   * Triggered on each publish request
   * @param user
   * @param pkg
   * @param cb
   */
  public allow_publish(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback): void {
    const groupsIntersection = intersection(user.groups, pkg?.publish || []);
    if (pkg?.publish?.includes(user.name ?? '') || groupsIntersection.length > 0) {
      this.logger.debug({ name: user.name }, '@{name} has been granted to publish');
      cb(null, true);
    } else {
      this.logger.error({ name: user.name }, '@{name} is not allowed to publish this package');
      cb(getUnauthorized('not authorized to publish this package'), false);
    }
  }

  /**
   * Triggered on each unpublish request
   * @param user
   * @param pkg
   * @param cb
   */
  public allow_unpublish(user: RemoteUser, pkg: PackageAccess & UnpublishPackageAccess, cb: AuthAccessCallback): void {
    const groupsIntersection = intersection(user.groups, pkg?.unpublish || []);
    if (pkg?.unpublish?.includes(user.name ?? '') || groupsIntersection.length > 0) {
      this.logger.debug({ name: user.name }, '@{name} has been granted to unpublish');
      cb(null, true);
    } else {
      this.logger.error({ name: user.name }, '@{name} is not allowed to unpublish this package');
      cb(getUnauthorized('not authorized to unpublish this package'), false);
    }
  }
}
