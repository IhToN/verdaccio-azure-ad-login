import { ropcStrategy } from '../../../auth/strategies/ropc';
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
  (mockLogger.warn as jest.Mock).mockClear();

  mockApi.prototype.decodeUsernameToEmail = jest.fn().mockImplementation((u: string) => u);
  mockApi.prototype.requestToken = jest.fn().mockResolvedValue({
    access_token: 'at',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: '',
  });
  mockApi.prototype.requestUserGroups = jest.fn().mockResolvedValue(['grp-1']);
});

describe('ropcStrategy', () => {
  it('returns user groups on success', async () => {
    const api = new AzureAPI({} as any);
    const result = await ropcStrategy(api, 'user@example.com', 'pass', mockLogger);

    expect(result).toEqual(['grp-1']);
    expect(mockApi.prototype.requestToken).toHaveBeenCalledWith('user@example.com', 'pass');
    expect(mockApi.prototype.requestUserGroups).toHaveBeenCalledWith('at');
  });

  it('emits logger.warn containing ROPC on each call', async () => {
    const api = new AzureAPI({} as any);
    await ropcStrategy(api, 'user@example.com', 'pass', mockLogger);

    expect(mockLogger.warn).toHaveBeenCalled();
    const warnArgs = (mockLogger.warn as jest.Mock).mock.calls[0];
    expect(warnArgs[1]).toContain('ROPC');
  });

  it('throws when requestToken rejects', async () => {
    mockApi.prototype.requestToken = jest.fn().mockRejectedValue(new Error('azure error'));
    const api = new AzureAPI({} as any);

    await expect(ropcStrategy(api, 'user@example.com', 'pass', mockLogger)).rejects.toThrow(
      'azure error'
    );
  });

  it('throws when requestUserGroups rejects', async () => {
    mockApi.prototype.requestUserGroups = jest.fn().mockRejectedValue(new Error('graph error'));
    const api = new AzureAPI({} as any);

    await expect(ropcStrategy(api, 'user@example.com', 'pass', mockLogger)).rejects.toThrow(
      'graph error'
    );
  });
});
