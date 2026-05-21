import express from 'express';
import request from 'supertest';

import { createAuthRouter } from '../../middleware/router';
import { createState, _resetForTest } from '../../middleware/oauthState';
import type { AzureConfig } from '../../../types/AzureConfig';
import type { AzureOAuth } from '../../../types/AzureOAuth';
import type AzureAPI from '../../AzureAPI';
import type { Logger } from '@verdaccio/types';

const mockConfig = {
  tenant: 'test-tenant',
  client_id: 'test-client-id',
  client_secret: 'test-secret',
  organization_domain: '',
  scope: '',
  allow_groups: [],
  group_name_key: 'mailNickname',
  redirect_uri: 'http://localhost:4873/-/auth/azure/callback',
} as unknown as AzureConfig;

const mockConfigNoRedirectUri = {
  ...mockConfig,
  redirect_uri: undefined,
} as unknown as AzureConfig;

const mockTokenResponse: AzureOAuth = {
  token_type: 'Bearer',
  scope: 'openid profile User.Read',
  expires_in: 3600,
  ext_expires_in: 3600,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  id_token: 'mock-id-token',
};

function makeApi(overrides: Partial<{
  requestAuthCodeToken: jest.Mock;
  requestUserGroups: jest.Mock;
}> = {}): AzureAPI {
  return {
    requestAuthCodeToken: jest.fn().mockResolvedValue(mockTokenResponse),
    requestUserGroups: jest.fn().mockResolvedValue(['azuread', 'dev-team']),
    ...overrides,
  } as unknown as AzureAPI;
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  child: jest.fn(),
  http: jest.fn(),
} as unknown as Logger;

function makeApp(
  api: AzureAPI = makeApi(),
  applyGroupPolicy: (groups: string[]) => { groups: string[] } | null = (g) => ({ groups: g }),
  config: AzureConfig = mockConfig
) {
  const app = express();
  app.use('/-/auth', createAuthRouter(config, api, applyGroupPolicy, mockLogger));
  return app;
}

beforeEach(() => {
  _resetForTest();
});

describe('GET /-/auth/azure', () => {
  it('returns 200 and response body contains Azure AD authorize URL hostname', async () => {
    const app = makeApp();
    const res = await request(app).get('/-/auth/azure');
    expect(res.status).toBe(200);
    expect(res.text).toContain('login.microsoftonline.com');
  });

  it('sets Content-Security-Policy header containing default-src none', async () => {
    const app = makeApp();
    const res = await request(app).get('/-/auth/azure');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('returns 500 error page when redirect_uri is not configured', async () => {
    const app = makeApp(makeApi(), (g) => ({ groups: g }), mockConfigNoRedirectUri);
    const res = await request(app).get('/-/auth/azure');
    expect(res.status).toBe(500);
    expect(res.text).toContain('redirect_uri is not configured');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });
});

describe('GET /-/auth/azure/callback', () => {
  it('returns 200 result page for valid state and successful token exchange', async () => {
    const api = makeApi();
    const app = makeApp(api);

    const state = createState('test-code-verifier');
    const res = await request(app)
      .get(`/-/auth/azure/callback?state=${encodeURIComponent(state)}&code=authcode123`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('mock-access-token');
    expect(res.text).toContain('npm config set');
    expect(api.requestAuthCodeToken).toHaveBeenCalledWith(
      'authcode123',
      'test-code-verifier',
      mockConfig.redirect_uri
    );
  });

  it('returns 400 for unknown or expired state', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/-/auth/azure/callback?state=bogus-state&code=authcode123');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Invalid or expired state');
  });

  it('returns 403 error page when group policy rejects the user', async () => {
    const api = makeApi();
    const state = createState('verifier-rejected');
    const denyAll = (_groups: string[]) => null;
    const app = makeApp(api, denyAll);

    const res = await request(app)
      .get(`/-/auth/azure/callback?state=${encodeURIComponent(state)}&code=authcode456`);

    expect(res.status).toBe(403);
    expect(res.text).toContain('does not have access');
    expect(res.text).not.toContain('mock-access-token');
  });

  it('returns escaped error page when Azure AD returns an error query param', async () => {
    const app = makeApp();
    const maliciousDescription = '<script>alert(1)</script>';
    const res = await request(app).get(
      `/-/auth/azure/callback?error=access_denied&error_description=${encodeURIComponent(maliciousDescription)}`
    );

    expect(res.status).toBe(400);
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  it('sets Content-Security-Policy header on error responses', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/-/auth/azure/callback?state=invalid-state&code=x');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('returns 400 when state or code query param is missing', async () => {
    const app = makeApp();
    // Missing code param
    const res = await request(app).get('/-/auth/azure/callback?state=some-state');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Missing state or code');
  });

  it('returns 500 when redirect_uri is not configured at callback time', async () => {
    const state = createState('verifier-nouri');
    const app = makeApp(makeApi(), (g) => ({ groups: g }), mockConfigNoRedirectUri);
    const res = await request(app)
      .get(`/-/auth/azure/callback?state=${encodeURIComponent(state)}&code=xyz`);
    expect(res.status).toBe(500);
    expect(res.text).toContain('redirect_uri is not configured');
  });

  it('returns 502 when requestAuthCodeToken throws', async () => {
    const api = makeApi({
      requestAuthCodeToken: jest.fn().mockRejectedValue(new Error('token exchange failed')),
    });
    const state = createState('verifier-throw-token');
    const app = makeApp(api);
    const res = await request(app)
      .get(`/-/auth/azure/callback?state=${encodeURIComponent(state)}&code=badcode`);
    expect(res.status).toBe(502);
    expect(res.text).toContain('token exchange failed');
  });

  it('returns 502 when requestUserGroups throws', async () => {
    const api = makeApi({
      requestUserGroups: jest.fn().mockRejectedValue(new Error('graph api error')),
    });
    const state = createState('verifier-throw-groups');
    const app = makeApp(api);
    const res = await request(app)
      .get(`/-/auth/azure/callback?state=${encodeURIComponent(state)}&code=validcode`);
    expect(res.status).toBe(502);
    expect(res.text).toContain('graph api error');
  });

  it('returns 400 with Azure error code when error_description is absent', async () => {
    const app = makeApp();
    const res = await request(app).get(
      '/-/auth/azure/callback?error=interaction_required'
    );
    expect(res.status).toBe(400);
    expect(res.text).toContain('interaction_required');
  });
});
