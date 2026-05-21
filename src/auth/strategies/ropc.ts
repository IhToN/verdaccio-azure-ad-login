import type { Logger } from '@verdaccio/types';
import type AzureAPI from '../../AzureAPI';

export async function ropcStrategy(
  api: AzureAPI,
  user: string,
  password: string,
  logger: Logger
): Promise<string[]> {
  logger.warn(
    {},
    'verdaccio-azure-ad-login: ROPC auth mode is deprecated; migrate to auth_mode: token using az account get-access-token'
  );
  const token = await api.requestToken(api.decodeUsernameToEmail(user), password);
  logger.debug({ token }, 'MS Token Received >> @{token}');
  const userGroups = await api.requestUserGroups(token.access_token);
  logger.debug({ userGroups }, 'User is member of these groups >> @{userGroups}');
  return userGroups;
}
