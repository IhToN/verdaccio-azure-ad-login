import { autoStrategy } from '../../../auth/strategies/auto';
import AzureAPI from '../../../AzureAPI';
import type { Logger } from '@verdaccio/types';

jest.mock('../../../AzureAPI');

const mockApi = AzureAPI as jest.MockedClass<typeof AzureAPI>;

const JWT_PASSWORD = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIn0.sig';
const PLAIN_PASSWORD = 'plainpassword';

const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  http: jest.fn(),
  child: jest.fn().mockReturnThis(),
} as unknown as Logger;

beforeEach(() => {
  mockApi.mockClear();
  (mockLogger.debug as jest.Mock).mockClear();
  (mockLogger.warn as jest.Mock).mockClear();

  mockApi.prototype.decodeUsernameToEmail = jest.fn().mockImplementation((u: string) => u);
  mockApi.prototype.requestToken = jest.fn().mockResolvedValue({
    access_token: 'at',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: '',
  });
  mockApi.prototype.requestUserGroups = jest.fn().mockResolvedValue(['ropc-grp']);
  mockApi.prototype.requestUserGroupsForToken = jest.fn().mockResolvedValue(['jwt-grp']);
});

describe('autoStrategy', () => {
  it('JWT-shaped password routes to token path: requestUserGroupsForToken called, requestToken not called', async () => {
    const api = new AzureAPI({} as any);
    await autoStrategy(api, 'user@example.com', JWT_PASSWORD, mockLogger);

    expect(mockApi.prototype.requestUserGroupsForToken).toHaveBeenCalledTimes(1);
    expect(mockApi.prototype.requestToken).not.toHaveBeenCalled();
  });

  it('plain password routes to ropc path: requestToken called, requestUserGroupsForToken not called', async () => {
    const api = new AzureAPI({} as any);
    await autoStrategy(api, 'user@example.com', PLAIN_PASSWORD, mockLogger);

    expect(mockApi.prototype.requestToken).toHaveBeenCalledTimes(1);
    expect(mockApi.prototype.requestUserGroupsForToken).not.toHaveBeenCalled();
  });

  it('ROPC routing emits logger.warn containing ROPC', async () => {
    const api = new AzureAPI({} as any);
    await autoStrategy(api, 'user@example.com', PLAIN_PASSWORD, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalled();
    const warnArgs = (mockLogger.warn as jest.Mock).mock.calls[0];
    expect(warnArgs[1]).toContain('ROPC');
  });

  it('JWT routing emits logger.debug with detected: token', async () => {
    const api = new AzureAPI({} as any);
    await autoStrategy(api, 'user@example.com', JWT_PASSWORD, mockLogger);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ detected: 'token' }),
      expect.stringContaining('auto mode detected')
    );
  });
});
