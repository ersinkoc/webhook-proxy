/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/server/jest.config.js',
    '<rootDir>/packages/cli/jest.config.js',
    '<rootDir>/packages/shared/jest.config.js',
    '<rootDir>/packages/web/jest.config.js',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/__mocks__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};