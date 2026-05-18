import axios from 'axios';
import AzureAPI from '../AzureAPI';
import { AzureConfig } from '../../types/AzureConfig';

jest.mock('axios');

const { AxiosError } = jest.requireActual<typeof import('axios')>('axios');

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AzureAPI.requestToken()', () => {
  let api: AzureAPI;

  beforeEach(() => {
    api = new AzureAPI({
      tenant: 'test-tenant',
      client_id: 'test-client-id',
      client_secret: 'test-secret',
    } as AzureConfig);
  });

  it('returns parsed data on success', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        access_token: 'mock-token',
        token_type: 'Bearer',
        expires_in: 3599,
        scope: 'user.read openid',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const result = await api.requestToken('u', 'p');

    expect(result).toEqual({
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: 3599,
      scope: 'user.read openid',
    });
  });

  it('wraps AxiosError into descriptive Error', async () => {
    const axiosError = new AxiosError('Unauthorized', '401', {} as any, null, {
      status: 401,
      data: { error: 'invalid_grant', error_description: 'AADSTS50126: Bad credentials' },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any,
    });
    mockedAxios.mockRejectedValueOnce(axiosError);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    await expect(api.requestToken('u', 'bad')).rejects.toThrow(
      /Failed requesting Azure AD access token:.*AADSTS50126/
    );
  });

  it('wraps AxiosError without response data using error.message', async () => {
    const axiosError = new AxiosError('Network Error', 'ERR_NETWORK', {} as any, null, undefined);
    mockedAxios.mockRejectedValueOnce(axiosError);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    await expect(api.requestToken('u', 'p')).rejects.toThrow(/Failed requesting Azure AD access token:.*Network Error/);
  });

  it('rethrows non-Axios errors unchanged', async () => {
    mockedAxios.mockRejectedValueOnce(new Error('socket hang up'));

    await expect(api.requestToken('u', 'p')).rejects.toThrow('socket hang up');
  });
});

describe('AzureAPI.requestUserGroups()', () => {
  let api: AzureAPI;

  beforeEach(() => {
    api = new AzureAPI({
      tenant: 'test-tenant',
      client_id: 'test-client-id',
      client_secret: 'test-secret',
      allow_groups: ['devs'],
      group_name_key: 'mailNickname',
    } as AzureConfig);
  });

  it('returns BASE_GROUPS when allow_groups is empty (no axios calls)', async () => {
    const apiNoGroups = new AzureAPI({
      tenant: 'test-tenant',
      client_id: 'test-client-id',
      client_secret: 'test-secret',
      allow_groups: [],
    } as AzureConfig);

    const result = await apiNoGroups.requestUserGroups('token');

    expect(mockedAxios).not.toHaveBeenCalled();
    expect(result).toEqual(['azuread']);
  });

  it('returns BASE_GROUPS merged with group names when allow_groups configured (two sequential axios calls)', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { value: ['group-id-1'] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }) // getUserGroups
      .mockResolvedValueOnce({
        data: { value: [{ mailNickname: 'devs' }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }); // getGroupsInformation

    const result = await api.requestUserGroups('token');

    expect(mockedAxios).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['azuread', 'devs']);
  });
});

describe('AzureAPI.decodeUsernameToEmail()', () => {
  let api: AzureAPI;

  beforeEach(() => {
    api = new AzureAPI({
      tenant: 'test-tenant',
      client_id: 'test-client-id',
      client_secret: 'test-secret',
      organization_domain: 'example.com',
    } as AzureConfig);
  });

  it('returns unchanged when input already contains @', () => {
    expect(api.decodeUsernameToEmail('user@example.com')).toBe('user@example.com');
  });

  it('converts .. separator to @ sign', () => {
    expect(api.decodeUsernameToEmail('user..example.com')).toBe('user@example.com');
  });

  it('appends organization_domain when no @ and no .. present', () => {
    expect(api.decodeUsernameToEmail('user')).toBe('user@example.com');
  });

  it('returns unchanged when no @, no .., and no organization_domain', () => {
    const apiNoDomain = new AzureAPI({
      tenant: 'test-tenant',
      client_id: 'test-client-id',
      client_secret: 'test-secret',
    } as AzureConfig);
    expect(apiNoDomain.decodeUsernameToEmail('user')).toBe('user');
  });
});
