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
    // Temporary: run tests serially to prevent race conditions between integration test files
    // that each call category.deleteMany(). Remove once each suite cleans up only its own records.
    maxWorkers: 1,
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/generated/**',
        '!src/__tests__/**',
        '!src/types/**',
        '!src/server.ts',
    ],
    coverageDirectory: 'coverage',
    coverageThreshold: {
        // Lines must stay ≥70% per issue #61.
        // Branch coverage is lower (~49%) because many modules (cloudinary, FCM, email, banners,
        // vendor-payout transfers, etc.) are infrastructure-level and not exercised in the current
        // test suite. Raise the branch floor incrementally as coverage improves.
        global: { lines: 70 },
    },
    testTimeout: 15000,
};
