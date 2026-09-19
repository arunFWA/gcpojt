/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: {
      lines: 70,
    },
    './src/*/service/**/*.ts': {
      lines: 80,
    },
    './src/*/routes/**/*.ts': {
      lines: 70,
    },
    './src/shared/**/*.ts': {
      lines: 60,
    },
  },
};
