module.exports = {
  name: 'verdaccio-azure-ad-login',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  // Jest 26 does not handle the `node:` protocol prefix used by newer packages
  // (e.g. formidable used by supertest v7). The custom resolver strips the
  // `node:` prefix so Jest's default resolver can find the built-in modules.
  resolver: '<rootDir>/jest-resolver.js',
  // Setup file patches Module.builtinModules to include `node:*` prefixed names
  // so Jest 26's isCoreModule() short-circuits on require('node:fs') etc.
  setupFiles: ['<rootDir>/jest-setup-node-protocol.js'],
  // Use node environment — this plugin is server-side only (no browser APIs needed)
  // and newer transitive deps (e.g. formidable via supertest) require TextEncoder
  // which is only available in Jest 26 when testEnvironment is 'node'.
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: ['node_modules', 'lib', 'jest-node-builtins'],
  testPathIgnorePatterns: ['node_modules', '\\.claude/'],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
};
