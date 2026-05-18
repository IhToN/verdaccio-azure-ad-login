import {
  PluginOptions,
  AuthCallback,
  IPluginAuth,
  Logger,
  RemoteUser,
  PackageAccess,
  AuthAccessCallback,
} from '@verdaccio/types';
import { getUnauthorized } from '@verdaccio/commons-api';

import { AzureConfig } from '../types/AzureConfig';
import { UnpublishPackageAccess } from '../types/UnpublishPackageAccess';

import AzureAPI from './AzureAPI';
import { intersection } from './helpers';

/**
 * Custom Verdaccio Authenticate Plugin.
 */
export default class AuthCustomPlugin implements IPluginAuth<AzureConfig> {
  public logger: Logger;
  public api: AzureAPI;

  public constructor(config: AzureConfig, options: PluginOptions<AzureConfig>) {
    this.logger = options.logger;

    // Validate required fields — fail at startup, not at first login (D-02, D-03, D-04)
    const missing = (['tenant', 'client_id', 'client_secret'] as const).filter(
      (key) => !config[key] || config[key].trim() === ''
    );
    if (missing.length > 0) {
      throw new Error(`verdaccio-azure-ad-login: Missing required config fields: ${missing.join(', ')}`);
    }

    // Startup config log — operational visibility with secret redacted (FEAT-02 / Discretion)
    this.logger.info(
      {
        tenant: config.tenant,
        client_id: config.client_id,
        client_secret: '***',
        allow_groups: config.allow_groups?.length ? config.allow_groups : undefined,
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
  public async authenticate(user: string, password: string, cb: AuthCallback): Promise<void> {
    this.logger.debug({ user }, 'Trying to authenticate: @{user}');

    try {
      const token = await this.api.requestToken(this.api.decodeUsernameToEmail(user), password);
      this.logger.debug({ token }, 'MS Token Received >> @{token}');

      const userGroups = await this.api.requestUserGroups(token.access_token);
      this.logger.debug({ userGroups }, 'User is member of these groups >> @{userGroups}');

      if (this.api.allow_groups.length === 0) {
        cb(null, userGroups);
      } else {
        const groupsIntersection = intersection(userGroups, this.api.allow_groups);
        this.logger.debug(
          { groupsIntersection },
          'Intersection between User Groups and Allowed Groups >> @{groupsIntersection}'
        );

        if (groupsIntersection.length > 0) {
          // remove duplicated
          const groups = Array.from(new Set([...this.api.BASE_GROUPS, ...groupsIntersection]));
          cb(null, groups);
        } else {
          cb(getUnauthorized('the user does not have enough privileges'), false);
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Error authentication in Azure >> @{error}');
      cb(getUnauthorized('bad username/password, access denied'), false);
    }
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
