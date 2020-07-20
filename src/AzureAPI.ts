import querystring from 'querystring';

import axios from 'axios';

import { AzureConfig } from '../types/AzureConfig';
import { AzureOAuth } from '../types/AzureOAuth';

const BASE_SCOPE = 'user.read openid profile offline_access';

const API_URL = 'https://login.microsoftonline.com/';
const TOKEN_ENDPOINT = '/oauth2/v2.0/token';

const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const MEMBER_GROUPS_ENDPOINT = '/me/getMemberGroups';
const GROUPS_INFO_ENDPOINT = '/directoryObjects/getByIds';

export default class AzureAPI {
  private readonly tenant: string;
  private readonly client_id: string;
  private readonly client_secret: string;
  private readonly scope: string;
  private readonly organization_domain: string;
  public readonly allow_groups: Array<string>;

  public readonly BASE_GROUPS = ['azuread'];

  public constructor(config: AzureConfig) {
    this.tenant = config.tenant;
    this.client_id = config.client_id;
    this.client_secret = config.client_secret;
    this.allow_groups = config.allow_groups || [];
    this.scope = BASE_SCOPE + (config.scope ? ` ${config.scope}` : '');
    this.organization_domain = config.organization_domain || '';
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
      throw new Error('Failed requesting Azure AD access token: ' + error.message);
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
      .then((groups) => groups.map((el) => el.mailNickname));
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
