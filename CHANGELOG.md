# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.4.0...v2.0.0) (2026-05-21)


### Features

* **auth:** extract auth strategy modules and dispatcher ([4c2f47c](https://github.com/IhToN/verdaccio-azure-ad-login/commit/4c2f47c011f65e902b35d06892478d40fd038507))
* **azure-api:** add requestAuthCodeToken for authorization_code + PKCE exchange ([13b82c6](https://github.com/IhToN/verdaccio-azure-ad-login/commit/13b82c6349bba9c86646da77a71a5e902c6c3b33))
* **config:** add optional redirect_uri field to AzureConfig ([879961c](https://github.com/IhToN/verdaccio-azure-ad-login/commit/879961c3d31980ec97cfde228b1f4ee5e3bc0f82))
* **config:** require independent credentials per plugin section ([fc9628b](https://github.com/IhToN/verdaccio-azure-ad-login/commit/fc9628bfaced28a4d9d636fb09a92e64cbd9e178))
* **middleware:** add html templates, login route, and register_middlewares ([810510f](https://github.com/IhToN/verdaccio-azure-ad-login/commit/810510f11c8dd2ea78d26c133643f1a6245af122))
* **middleware:** add script-src 'unsafe-inline' to CSP_HEADER for copy button onclick handlers ([1b22f60](https://github.com/IhToN/verdaccio-azure-ad-login/commit/1b22f60fb4d8fed7bcdd30e23bb4b25d17bc02fe))
* **middleware:** enhance result page with UPN display, expiry, and clipboard copy buttons ([2f7fbcf](https://github.com/IhToN/verdaccio-azure-ad-login/commit/2f7fbcfb12e9fbf26dda8ec51a4c44bcaaf4cfc1))
* **middleware:** implement GET /-/auth/azure/callback with PKCE exchange and group policy ([2ffb62a](https://github.com/IhToN/verdaccio-azure-ad-login/commit/2ffb62ace9239f47075c1dafee4941137cbe910f))
* **middleware:** pass id_token and expires_in to renderResultPage in callback handler ([940140c](https://github.com/IhToN/verdaccio-azure-ad-login/commit/940140c5b6819acdddba3acbbe6e9f847c7d7bc6))
* **oauth-state:** add CSRF-safe OAuth state store with TTL and capacity cap ([6826aa2](https://github.com/IhToN/verdaccio-azure-ad-login/commit/6826aa2e625857be3f8ebcb43a5fd0e9889069b2))
* **pkce:** add PKCE S256 code verifier and challenge utilities ([3831732](https://github.com/IhToN/verdaccio-azure-ad-login/commit/383173228f86d0fb2c024f6dc5e4cc849d88827a))
* **plugin:** warn on startup when redirect_uri is not configured ([bb77f0c](https://github.com/IhToN/verdaccio-azure-ad-login/commit/bb77f0c35be98f8d6735b43ec8dd5bc6863a8217))


### Bug Fixes

* **azure-api:** replace deprecated querystring with URLSearchParams ([f9246e6](https://github.com/IhToN/verdaccio-azure-ad-login/commit/f9246e624e3c15d578b625c5f8efef46590b0756))
* **config:** raise engines.node constraint from >=10 to >=16 ([2622d1f](https://github.com/IhToN/verdaccio-azure-ad-login/commit/2622d1f9586792807fade23b5e5050e2af99bcab))
* **lint:** wire eslint flat config and fix Node 20.10 compatibility ([e3466da](https://github.com/IhToN/verdaccio-azure-ad-login/commit/e3466da255931bdb258d095095d14969ffc0e0bb))
* **plugin:** use enabled flag to detect middleware instance ([5256a24](https://github.com/IhToN/verdaccio-azure-ad-login/commit/5256a24e51e3b6adae1fd85c0ece902b3906e09c))
* **router:** address Copilot PR review findings ([fdf332f](https://github.com/IhToN/verdaccio-azure-ad-login/commit/fdf332fae521f7c6d5d79ba4945d26e0e7bc7df0))
* **router:** replace Host header with redirect_uri host in npm command ([db89c5c](https://github.com/IhToN/verdaccio-azure-ad-login/commit/db89c5cc975dc4376403c95e5a394a2c3c6b7fd3))
* **router:** replace leaked Azure AD error detail with generic message ([e20c235](https://github.com/IhToN/verdaccio-azure-ad-login/commit/e20c23544bebc6a9938cf934b6489826b25609ab))
* **router:** wrap async callback in void IIFE to satisfy no-misused-promises ([e323aec](https://github.com/IhToN/verdaccio-azure-ad-login/commit/e323aec7109818e10ba8f00273d8eb68e8d5b5f2))

## [1.4.0](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.3.0...v1.4.0) (2026-05-20)


### Features

* **auth:** add auth_mode: auto with JWT heuristic detection ([a8eb634](https://github.com/IhToN/verdaccio-azure-ad-login/commit/a8eb634cc1cd7bda02a63d3e244ff76111079591))

## [1.3.0](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.2.0...v1.3.0) (2026-05-19)


### Features

* **auth:** wire ci_mode early branch into authenticate() ([2941af3](https://github.com/IhToN/verdaccio-azure-ad-login/commit/2941af30c55213c1efcd3da08b375b038c1342bb))
* **azure-api:** add app-only client_credentials flow for ci_mode ([68573a4](https://github.com/IhToN/verdaccio-azure-ad-login/commit/68573a45fc7efc75b0114021dc3f4862c0c3c44e))
* **config:** add ci_mode?: boolean to AzureConfig ([562ef45](https://github.com/IhToN/verdaccio-azure-ad-login/commit/562ef4558339644f71889b5bfe53f846a0209365))

## [1.2.0](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.1.2...v1.2.0) (2026-05-19)


### Features

* **auth:** add auth_mode branching, applyGroupPolicy helper, and ROPC deprecation ([5d4d0aa](https://github.com/IhToN/verdaccio-azure-ad-login/commit/5d4d0aa631f2f56f543d8f4d12e64b786cd5214e))
* **azure-api:** add auth_mode field, token cache, and PAT passthrough methods ([7a7ecab](https://github.com/IhToN/verdaccio-azure-ad-login/commit/7a7ecab24db0bcb3ed8a5036784f4281d856ea9d))
* **ci:** add GitHub Actions workflow with audit, test, and lint jobs ([de3fc35](https://github.com/IhToN/verdaccio-azure-ad-login/commit/de3fc35822f34d7fe9b7dee1a10270e3ad7ae791))


### Bug Fixes

* **deps:** pin transitive vulnerability chains via package.json overrides ([13c1921](https://github.com/IhToN/verdaccio-azure-ad-login/commit/13c192134898d1f38713511ca48b2c6dec49d3f0))
* **lint:** migrate to ESLint flat config (eslint.config.mjs) ([0f7aee4](https://github.com/IhToN/verdaccio-azure-ad-login/commit/0f7aee462d7b14c7a6cd02bc6ded4cc597a7b907))
* **tests:** exclude compiled lib/ output from jest coverage collection ([7755bed](https://github.com/IhToN/verdaccio-azure-ad-login/commit/7755bed79e92b6811a2909f182175f6b220615e6))

### [1.1.2](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.1.1...v1.1.2) (2026-05-18)


### Bug Fixes

* **acl:** fix per-user package access control and add descriptive rejection messages ([bd0be27](https://github.com/IhToN/verdaccio-azure-ad-login/commit/bd0be274081b67a450c139ac184d5aead84758ca))
* **auth:** add config validation, startup log, async/await conversion ([7ef2906](https://github.com/IhToN/verdaccio-azure-ad-login/commit/7ef29068edff19fa1a4940ade546fc67d58f4a9e))

### [1.1.1](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.1.0...v1.1.1) (2021-09-24)

## [1.1.0](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.5...v1.1.0) (2021-07-07)

### [1.0.5](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.4...v1.0.5) (2021-02-25)

### [1.0.4](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.3...v1.0.4) (2021-02-24)

### [1.0.3](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.2...v1.0.3) (2020-07-20)

### [1.0.2](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.1...v1.0.2) (2020-07-20)

### [1.0.1](https://github.com/IhToN/verdaccio-azure-ad-login/compare/v1.0.0...v1.0.1) (2020-07-20)

## 1.0.0 (2020-07-16)
