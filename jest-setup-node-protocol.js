/**
 * Jest 26 setup: register `node:*` protocol modules as built-ins so Jest's
 * resolver recognises `require('node:fs')` etc. used by newer packages
 * (e.g. formidable, a transitive dependency of supertest v7).
 *
 * Jest 26's `isCoreModule` check uses `Module.builtinModules` which only
 * lists bare names ('fs', 'crypto', ...) — not the `node:` prefixed form.
 * This setup file appends the prefixed names so Jest short-circuits to
 * `require('node:fs')` instead of trying to resolve them as file paths.
 */
const Module = require('module');
if (Module.builtinModules) {
  // Module.builtinModules is frozen — replace the property entirely.
  const existing = Array.from(Module.builtinModules);
  const prefixed = existing
    .filter(name => !name.startsWith('node:'))
    .map(name => `node:${name}`);
  Object.defineProperty(Module, 'builtinModules', {
    value: existing.concat(prefixed),
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
