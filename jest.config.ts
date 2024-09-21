import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '<rootDir>/src/*.ts'],
  coveragePathIgnorePatterns: ['<rootDir>/src/types', '<rootDir>/src/main.ts'],
  preset: 'ts-jest',
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@/tests/(.*)': '<rootDir>/tests/$1',
  },
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.test.(ts)',
    '<rootDir>/src/**/*.spec.(ts)',
    '<rootDir>/src/*.test.(ts)',
    '<rootDir>/src/*.spec.(ts)',
  ],
  verbose: true,
};

export default config;
