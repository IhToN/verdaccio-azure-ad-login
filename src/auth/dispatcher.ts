import type { Logger } from '@verdaccio/types';
import type AzureAPI from '../AzureAPI';
import { ropcStrategy } from './strategies/ropc';
import { tokenStrategy } from './strategies/token';
import { ciStrategy } from './strategies/ci';
import { autoStrategy } from './strategies/auto';

export async function dispatchAuth(
  api: AzureAPI,
  user: string,
  password: string,
  logger: Logger,
  ciMode: boolean
): Promise<string[]> {
  if (ciMode) {
    return ciStrategy(api, user, logger);
  }
  const mode = api.auth_mode;
  switch (mode) {
    case 'auto':
      return autoStrategy(api, user, password, logger);
    case 'token':
      return tokenStrategy(api, user, password, logger);
    case 'ropc':
      return ropcStrategy(api, user, password, logger);
    default:
      throw new Error(`unknown auth_mode: ${mode as string}`);
  }
}
