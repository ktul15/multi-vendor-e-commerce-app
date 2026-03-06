/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
    },
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/generated/**',
        '!src/__tests__/**',
        '!src/types/**',
        '!src/server.ts',
    ],
    coverageDirectory: 'coverage',
    testTimeout: 15000,
};
