// eslint.config.mjs
// .mjs extension forces ESM parsing without requiring "type": "module" in package.json.
// @verdaccio/eslint-config already exports flat config including globalIgnores for
// node_modules/, lib/, dist/, build/ — no .eslintignore needed.
import verdaccioConfig from '@verdaccio/eslint-config';
import { globalIgnores } from 'eslint/config';

export default [
  globalIgnores(['.claude/', 'index.ts']),
  ...verdaccioConfig,
  // Root-level CommonJS infra files (jest config) use require()
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
