import type { Logger } from '@verdaccio/types';
import type AzureAPI from '../../AzureAPI';

export async function tokenStrategy(
  api: AzureAPI,
  user: string,
  password: string,
  logger: Logger
): Promise<string[]> {
  const groups = await api.requestUserGroupsForToken(
    password,
    api.decodeUsernameToEmail(user)
  );
  logger.debug({ groups }, 'User is member of these groups >> @{groups}');
  return groups;
}
