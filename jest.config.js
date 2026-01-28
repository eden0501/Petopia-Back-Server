module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./jest.setup.ts"],
  roots: ["<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/tests/**",
    "!src/index.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  verbose: true,
};
