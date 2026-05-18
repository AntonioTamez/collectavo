// apps/core-api/jest.config.js
// Jest + ts-jest configuration for NestJS Core API
// Source: NestJS testing documentation

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@db/(.*)$': '<rootDir>/generated/prisma/$1',
  },
};
