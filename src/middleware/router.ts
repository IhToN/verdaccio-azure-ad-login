import express from 'express';
import type { Logger } from '@verdaccio/types';

import type { AzureConfig } from '../../types/AzureConfig';
import type AzureAPI from '../AzureAPI';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';
import { createState } from './oauthState';
import { renderErrorPage } from './html';

export const CSP_HEADER = "default-src 'none'; style-src 'unsafe-inline'";

export function createAuthRouter(
  config: AzureConfig,
  _api: AzureAPI,
  _applyGroupPolicy: (userGroups: string[]) => { groups: string[] } | null,
  _logger: Logger
): express.Router {
  const router = express.Router();

  router.get('/azure', (_req, res) => {
    if (!config.redirect_uri) {
      res.setHeader('Content-Security-Policy', CSP_HEADER);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(renderErrorPage('redirect_uri is not configured on the server'));
      return;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = createState(codeVerifier);

    const authorizeUrl = new URL(
      `https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/authorize`
    );
    authorizeUrl.searchParams.set('client_id', config.client_id);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', config.redirect_uri);
    authorizeUrl.searchParams.set('scope', 'openid profile User.Read');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    const urlString = authorizeUrl.toString();
    // Escape & as &amp; for the HTML attribute value; browsers decode it before following the URL
    const escapedUrl = urlString.replace(/&/g, '&amp;');

    res.setHeader('Content-Security-Policy', CSP_HEADER);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(
      `<!DOCTYPE html><html><head>` +
      `<meta http-equiv="refresh" content="0;url=${escapedUrl}">` +
      `</head><body></body></html>`
    );
  });

  // GET /azure/callback — implemented in Plan 10-02

  return router;
}
