import express from 'express';
import type { Logger } from '@verdaccio/types';

import type { AzureConfig } from '../../types/AzureConfig';
import type AzureAPI from '../AzureAPI';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';
import { createState, validateAndConsumeState } from './oauthState';
import { renderErrorPage, renderResultPage } from './html';

export const CSP_HEADER = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'";

export function createAuthRouter(
  config: AzureConfig,
  api: AzureAPI,
  applyGroupPolicy: (userGroups: string[]) => { groups: string[] } | null,
  logger: Logger
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

  router.get('/azure/callback', async (req, res) => {
    const sendError = (status: number, message: string): void => {
      res.setHeader('Content-Security-Policy', CSP_HEADER);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(status).send(renderErrorPage(message));
    };

    // Azure AD error redirect
    const azureError = req.query['error'];
    const azureErrorDescription = req.query['error_description'];
    if (typeof azureError === 'string') {
      const message = typeof azureErrorDescription === 'string'
        ? azureErrorDescription
        : azureError;
      sendError(400, message);
      return;
    }

    const state = req.query['state'];
    const code = req.query['code'];

    if (typeof state !== 'string' || typeof code !== 'string') {
      sendError(400, 'Missing state or code parameter');
      return;
    }

    // CSRF state validation (single-use, TTL-checked)
    const codeVerifier = validateAndConsumeState(state);
    if (codeVerifier === null) {
      sendError(400, 'Invalid or expired state parameter');
      return;
    }

    if (!config.redirect_uri) {
      sendError(500, 'redirect_uri is not configured on the server');
      return;
    }

    // Exchange authorization code for tokens
    let tokenResponse;
    try {
      tokenResponse = await api.requestAuthCodeToken(code, codeVerifier, config.redirect_uri);
    } catch (err) {
      logger.error({ err }, 'Azure AD token exchange failed: @{err}');
      const message = err instanceof Error ? err.message : 'Token exchange failed';
      sendError(502, message);
      return;
    }

    // Resolve group membership
    let userGroups: string[];
    try {
      userGroups = await api.requestUserGroups(tokenResponse.access_token);
    } catch (err) {
      logger.error({ err }, 'Group resolution failed: @{err}');
      const message = err instanceof Error ? err.message : 'Group resolution failed';
      sendError(502, message);
      return;
    }

    // Apply group policy
    const policy = applyGroupPolicy(userGroups);
    if (policy === null) {
      sendError(403, 'Your account does not have access to this registry');
      return;
    }

    // Build npm config set command (RESULT-02)
    const host = req.headers['host'] ?? 'localhost';
    const npmCmd = `npm config set //${host}/:_authToken "${tokenResponse.access_token}"`;

    res.setHeader('Content-Security-Policy', CSP_HEADER);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderResultPage(
      tokenResponse.access_token,
      npmCmd,
      tokenResponse.id_token,
      tokenResponse.expires_in
    ));
  });

  return router;
}
