module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  // Use node environment — this plugin is server-side only (no browser APIs needed)
  // and newer transitive deps (e.g. formidable via supertest) require TextEncoder
  // which is only available when testEnvironment is 'node'.
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: ['node_modules', 'lib'],
  testPathIgnorePatterns: ['node_modules', '\\.claude/', 'lib'],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
};
