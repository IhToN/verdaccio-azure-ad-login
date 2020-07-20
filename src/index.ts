import { PluginOptions, AuthCallback, IPluginAuth, Logger } from '@verdaccio/types';
import { getUnauthorized } from '@verdaccio/commons-api';

import { AzureConfig } from '../types/AzureConfig';

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
    this.api = new AzureAPI(config);
    return this;
  }
  /**
   * Authenticate an user.
   * @param user user to log
   * @param password provided password
   * @param cb callback function
   */
  public authenticate(user: string, password: string, cb: AuthCallback): void {
    this.logger.debug({ user, password }, 'Trying to authenticate: @{user} @{password}');

    this.api
      .requestToken(this.api.decodeUsernameToEmail(user), password)
      .then((token) => {
        this.logger.debug({ token }, 'MS Token Received >> @{token}');
        return this.api.requestUserGroups(token.access_token);
      })
      .then((userGroups) => {
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
      })
      .catch((error) => {
        this.logger.error({ error }, 'Error authentication in Azure >> @{error}');
        cb(getUnauthorized('bad username/password, access denied'), false);
      });
  }
}
