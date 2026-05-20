import type { Logger } from '@verdaccio/types';
import type AzureAPI from '../../AzureAPI';
import { looksLikeBearerToken } from '../../helpers';
import { ropcStrategy } from './ropc';
import { tokenStrategy } from './token';

export async function autoStrategy(
  api: AzureAPI,
  user: string,
  password: string,
  logger: Logger
): Promise<string[]> {
  const detected: 'token' | 'ropc' = looksLikeBearerToken(password) ? 'token' : 'ropc';
  logger.debug({ detected }, 'verdaccio-azure-ad-login: auto mode detected @{detected}');
  if (detected === 'token') {
    return tokenStrategy(api, user, password, logger);
  }
  return ropcStrategy(api, user, password, logger);
}
