import type { Logger } from '@verdaccio/types';
import type AzureAPI from '../../AzureAPI';

export async function ciStrategy(
  api: AzureAPI,
  user: string,
  logger: Logger
): Promise<string[]> {
  const groups = await api.requestGroupsAppOnly(api.decodeUsernameToEmail(user));
  logger.debug({ groups }, 'CI mode user groups >> @{groups}');
  return groups;
}
