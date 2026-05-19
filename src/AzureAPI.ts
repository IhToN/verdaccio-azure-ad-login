import { createHash } from 'crypto';
import querystring from 'querystring';

import axios from 'axios';

import type { AzureConfig } from '../types/AzureConfig';
import type { AzureOAuth } from '../types/AzureOAuth';

const BASE_SCOPE = 'user.read openid profile offline_access';

const API_URL = 'https://login.microsoftonline.com/';
const TOKEN_ENDPOINT = '/oauth2/v2.0/token';

const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const MEMBER_GROUPS_ENDPOINT = '/me/getMemberGroups';
const GROUPS_INFO_ENDPOINT = '/directoryObjects/getByIds';
const ME_ENDPOINT = '/me';

export default class AzureAPI {
  private readonly tenant: string;
  private readonly client_id: string;
  private readonly client_secret: string;
  private readonly scope: string;
  private readonly organization_domain: string;
  public readonly allow_groups: Array<string>;
  private readonly group_name_key: string;
  public readonly auth_mode: 'ropc' | 'token';
  private readonly tokenCache: Map<string, { groups: string[]; expiresAt: number }>;

  public readonly BASE_GROUPS = ['azuread'];

  public constructor(config: AzureConfig) {
    this.tenant = config.tenant;
    this.client_id = config.client_id;
    this.client_secret = config.client_secret;
    this.allow_groups = config.allow_groups || [];
    this.scope = BASE_SCOPE + (config.scope ? ` ${config.scope}` : '');
    this.organization_domain = config.organization_domain || '';
    this.group_name_key = config.group_name_key || 'mailNickname';
    this.auth_mode = config.auth_mode ?? 'ropc';
    this.tokenCache = new Map();
  }

  public get apiUrl(): string {
    return API_URL + this.tenant;
  }

  public get graphUrl(): string {
    return GRAPH_URL;
  }

  /**
   * `POST /oauth2/v2.0/token`
   *
   * @param username
   * @param password
   */
  public async requestToken(username: string, password: string): Promise<AzureOAuth> {
    const url = this.apiUrl + TOKEN_ENDPOINT;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const data = {
      client_id: this.client_id,
      client_secret: this.client_secret,
      scope: this.scope,
      grant_type: 'password',
      username,
      password,
    };

    const options = {
      method: 'POST',
      headers,
      data: querystring.stringify(data),
    } as const;

    try {
      return await axios(url, options).then((res) => res.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error_description || error.message || 'Unknown';
        throw new Error('Failed requesting Azure AD access token: ' + errorMsg, { cause: error });
      }
      throw error;
    }
  }

  private async getUserGroups(token: string): Promise<Array<string>> {
    const url = this.graphUrl + MEMBER_GROUPS_ENDPOINT;
    const data = { securityEnabledOnly: false };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    };

    const options = {
      method: 'POST',
      headers,
      data: data,
    } as const;

    return axios(url, options).then((res) => res.data?.value || []);
  }

  private async getGroupsInformation(token: string, groupsList: Array<string>) {
    const url = this.graphUrl + GROUPS_INFO_ENDPOINT;
    const data = { ids: groupsList, types: ['group'] };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    };

    const options = {
      method: 'POST',
      headers,
      data: data,
    } as const;

    return axios(url, options)
      .then((res) => res.data?.value || [])
      .then((groups) => groups.map((el) => el[this.group_name_key]));
  }

  private async getFinalUserGroups(groups: Array<string> | undefined = undefined): Promise<Array<string>> {
    return new Promise((resolve) => {
      let memberOf = this.BASE_GROUPS;
      if (groups && groups.length > 0) {
        memberOf = Array.from(new Set([...memberOf, ...groups]));
      }
      resolve(memberOf);
    });
  }

  /**
   *
   * @param token
   */
  public async requestUserGroups(token: string): Promise<Array<string>> {
    if (this.allow_groups.length <= 0) {
      return this.getFinalUserGroups();
    }

    const userGroups = await this.getUserGroups(token);
    const names = await this.getGroupsInformation(token, userGroups);

    return await this.getFinalUserGroups(names);
  }

  private async getUserMe(token: string): Promise<{ userPrincipalName: string }> {
    const url = this.graphUrl + ME_ENDPOINT;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    };
    const options = { method: 'GET', headers } as const;

    try {
      return await axios(url, options).then((res) => res.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown';
        throw new Error('Failed validating Azure AD token via /me: ' + errorMsg, { cause: error });
      }
      throw error;
    }
  }

  public async requestUserGroupsForToken(token: string, upn: string): Promise<string[]> {
    const key = createHash('sha256').update(token).digest('hex');
    const cached = this.tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.groups;
    }

    const me = await this.getUserMe(token);
    if (me.userPrincipalName.toLowerCase() !== upn.toLowerCase()) {
      throw new Error('token does not match user');
    }

    const groups = await this.requestUserGroups(token);
    this.tokenCache.set(key, { groups, expiresAt: Date.now() + 60_000 });
    return groups;
  }

  public decodeUsernameToEmail(username: string): string {
    if (username.includes('@')) {
      return username;
    }

    const pos = username.lastIndexOf('..');
    if (pos === -1) {
      if (this.organization_domain) {
        return `${username}@${this.organization_domain}`;
      }

      return username;
    }

    return `${username.substr(0, pos)}@${username.substr(pos + 2)}`;
  }
}
