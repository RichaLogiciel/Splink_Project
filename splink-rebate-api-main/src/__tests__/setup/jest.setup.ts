import { config } from "dotenv";

jest.mock("../../db", () => {
  const { Sequelize } = jest.requireActual("sequelize");

  // Create a test PostgreSQL instance
  const sequelizeMock = new Sequelize(
    "postgres://user:password@localhost:5432/testdb",
    {
      dialect: "postgres",
      logging: false // Disable logging during tests
    }
  );

  return {
    __esModule: true,
    default: sequelizeMock
  };
});

// Mock NewRelic before any imports
jest.mock("newrelic", () => require("./mocks/newrelic"));

// Load environment variables from .env file
config();

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock error handling middleware
jest.mock("express", () => {
  const originalModule = jest.requireActual("express");
  return {
    ...originalModule,
    json: jest.fn((data) => data),
    status: jest.fn((code) => ({
      json: jest.fn((data) => ({ status: code, ...data }))
    }))
  };
});

// Mock database sync
jest.mock("../../syncDatabase", () => ({
  __esModule: true,
  syncDatabase: jest.fn().mockResolvedValue(undefined)
}));

// Global beforeAll and afterAll hooks
const originalError = console.error;

beforeAll(() => {
  // Add any global setup here
  console.error = (..._args: any[]) => {
    return;
  };
});

afterAll(() => {
  // Add any global cleanup here
  console.error = originalError;
});

// Suppress console.error during tests to reduce noise

// Dummy test to prevent empty test suite warning
describe("Jest Setup", () => {
  it("should be properly configured", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.JWT_SECRET).toBe("test-secret");
  });
});
