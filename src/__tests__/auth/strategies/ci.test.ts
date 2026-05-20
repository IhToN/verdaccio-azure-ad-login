import { ciStrategy } from '../../../auth/strategies/ci';
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
  mockApi.prototype.requestGroupsAppOnly = jest.fn().mockResolvedValue(['ci-grp']);
});

describe('ciStrategy', () => {
  it('returns groups from requestGroupsAppOnly called with decoded username', async () => {
    mockApi.prototype.decodeUsernameToEmail = jest
      .fn()
      .mockImplementation(() => 'ci-user@example.com');
    const api = new AzureAPI({} as any);
    const result = await ciStrategy(api, 'ci-user@example.com', mockLogger);

    expect(result).toEqual(['ci-grp']);
    expect(mockApi.prototype.requestGroupsAppOnly).toHaveBeenCalledWith('ci-user@example.com');
  });

  it('throws when requestGroupsAppOnly rejects', async () => {
    mockApi.prototype.requestGroupsAppOnly = jest
      .fn()
      .mockRejectedValue(new Error('app-only error'));
    const api = new AzureAPI({} as any);

    await expect(ciStrategy(api, 'ci-user@example.com', mockLogger)).rejects.toThrow(
      'app-only error'
    );
  });
});
