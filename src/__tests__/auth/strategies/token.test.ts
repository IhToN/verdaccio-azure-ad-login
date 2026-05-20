import { tokenStrategy } from '../../../auth/strategies/token';
import AzureAPI from '../../../AzureAPI';
import type { Logger } from '@verdaccio/types';

jest.mock('../../../AzureAPI');

const mockApi = AzureAPI as jest.MockedClass<typeof AzureAPI>;

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

  mockApi.prototype.decodeUsernameToEmail = jest.fn().mockImplementation((u: string) => u);
  mockApi.prototype.requestUserGroupsForToken = jest.fn().mockResolvedValue(['grp-t']);
});

describe('tokenStrategy', () => {
  it('returns groups when requestUserGroupsForToken succeeds', async () => {
    const api = new AzureAPI({} as any);
    const result = await tokenStrategy(api, 'user@example.com', 'bearer-token', mockLogger);

    expect(result).toEqual(['grp-t']);
    expect(mockApi.prototype.requestUserGroupsForToken).toHaveBeenCalledWith(
      'bearer-token',
      'user@example.com'
    );
  });

  it('throws when requestUserGroupsForToken rejects', async () => {
    mockApi.prototype.requestUserGroupsForToken = jest
      .fn()
      .mockRejectedValue(new Error('token error'));
    const api = new AzureAPI({} as any);

    await expect(tokenStrategy(api, 'user@example.com', 'bearer-token', mockLogger)).rejects.toThrow(
      'token error'
    );
  });
});
