/**
 * Custom Jest resolver to handle the `node:` protocol prefix used by
 * newer npm packages (e.g. formidable used by supertest v7).
 *
 * Jest 26's built-in resolver does not recognise the `node:` prefix
 * (introduced in Node.js 14.18 / Node.js 16). When a package does
 * `require('node:fs')`, Jest intercepts it and tries to resolve it as
 * a file path — which fails with ENOENT.
 *
 * This resolver maps `node:*` specifiers to actual shim files in
 * jest-node-builtins/ that simply re-export the corresponding Node.js
 * built-in. For all other module names it delegates to the default
 * Jest resolver.
 */
const path = require('path');

// Map node: protocol specifiers → shim file names in jest-node-builtins/
const NODE_PROTOCOL_SHIMS = {
  'node:fs': 'fs.js',
  'node:fs/promises': 'fspromises.js',
  'node:path': 'path.js',
  'node:crypto': 'crypto.js',
  'node:events': 'events.js',
  'node:os': 'os.js',
  'node:stream': 'stream.js',
  'node:string_decoder': 'string_decoder.js',
};

const SHIMS_DIR = path.join(__dirname, 'jest-node-builtins');

module.exports = (moduleName, options) => {
  const shimFile = NODE_PROTOCOL_SHIMS[moduleName];
  if (shimFile) {
    return path.join(SHIMS_DIR, shimFile);
  }
  return options.defaultResolver(moduleName, options);
};
