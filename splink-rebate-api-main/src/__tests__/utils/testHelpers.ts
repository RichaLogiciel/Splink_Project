/**
 * Test Utilities and Helper Functions
 *
 * This file contains reusable utilities for testing across the application.
 */

import { Response } from "express";

/**
 * Creates a mock Express Response object for testing controllers
 */
export const createMockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Creates a mock Express Request object for testing controllers
 */
export const createMockRequest = (overrides: any = {}): any => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    ...overrides
  };
};

/**
 * Creates a mock authenticated request with user context
 */
export const createAuthenticatedRequest = (
  user: any,
  overrides: any = {}
): any => {
  return createMockRequest({
    user,
    headers: {
      authorization: "Bearer mock-token"
    },
    ...overrides
  });
};

/**
 * Creates a mock Redis client for testing cache operations
 */
export const createMockRedis = () => {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn()
  };
};

/**
 * Creates a mock Sequelize transaction for testing database operations
 */
export const createMockTransaction = () => {
  return {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    LOCK: {
      UPDATE: "UPDATE",
      SHARE: "SHARE"
    }
  };
};

/**
 * Creates a mock Sequelize model instance
 */
export const createMockModel = <T>(data: T): any => {
  return {
    ...data,
    get: jest.fn((key?: string) => (key ? (data as any)[key] : data)),
    set: jest.fn(),
    save: jest.fn().mockResolvedValue(data),
    destroy: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(data),
    update: jest.fn().mockResolvedValue(data),
    toJSON: jest.fn().mockReturnValue(data)
  };
};

/**
 * Creates a mock repository with common CRUD methods
 */
export const createMockRepository = <_T = any>() => {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    bulkDelete: jest.fn()
  };
};

/**
 * Generates a random ID for testing
 */
export const generateId = (): number => {
  return Math.floor(Math.random() * 1000000) + 1;
};

/**
 * Generates a random UUID for testing
 */
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Generates a random email for testing
 */
export const generateEmail = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
};

/**
 * Delays execution for testing async operations
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Creates a date in the past
 */
export const pastDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

/**
 * Creates a date in the future
 */
export const futureDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

/**
 * Formats a date as YYYY-MM-DD for testing
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Asserts that an error was thrown with specific message
 */
export const expectError = async (
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> => {
  await expect(fn()).rejects.toThrow(errorMessage);
};

/**
 * Asserts that a function resolved successfully
 */
export const expectSuccess = async <T>(fn: () => Promise<T>): Promise<T> => {
  const result = await fn();
  expect(result).toBeDefined();
  return result;
};

/**
 * Creates a paginated response structure for testing
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total?: number
) => {
  const totalRecords = total ?? data.length;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Creates a success response structure for testing
 */
export const createSuccessResponse = <T>(data: T, message?: string) => {
  return {
    success: true,
    message: message || "Operation successful",
    data
  };
};

/**
 * Creates an error response structure for testing
 */
export const createErrorResponse = (
  message: string,
  statusCode: number = 400,
  errors?: any[]
) => {
  return {
    success: false,
    message,
    statusCode,
    errors
  };
};

/**
 * Waits for all promises to resolve or reject
 */
export const waitForPromises = (): Promise<void> => {
  return new Promise((resolve) => setImmediate(resolve));
};

/**
 * Clears all mocks between tests
 */
export const clearAllMocks = (): void => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};

/**
 * Resets all mocks between tests
 */
export const resetAllMocks = (): void => {
  jest.resetAllMocks();
  jest.resetModules();
};

/**
 * Asserts that mock was called with partial arguments
 */
export const expectCalledWithPartial = (
  mock: jest.Mock,
  expectedArgs: any
): void => {
  expect(mock).toHaveBeenCalledWith(expect.objectContaining(expectedArgs));
};

/**
 * Asserts that an object matches a partial structure
 */
export const expectObjectMatch = (actual: any, expected: any): void => {
  expect(actual).toMatchObject(expected);
};

/**
 * Asserts that an array contains an object matching partial structure
 */
export const expectArrayContains = (array: any[], expected: any): void => {
  expect(array).toEqual(
    expect.arrayContaining([expect.objectContaining(expected)])
  );
};

/**
 * Creates a spy on a method that can be restored
 */
export const createSpy = <T>(
  object: T,
  method: keyof T,
  implementation?: (...args: any[]) => any
): jest.SpyInstance => {
  const spy = jest.spyOn(object as any, method as string);
  if (implementation) {
    spy.mockImplementation(implementation);
  }
  return spy;
};

/**
 * Mocks console methods to suppress output during tests
 */
/* eslint-disable no-console */
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();

  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    }
  };
};
/* eslint-enable no-console */

/**
 * Creates a mock file object for upload testing
 */
export const createMockFile = (
  filename: string = "test.jpg",
  mimetype: string = "image/jpeg",
  size: number = 1024
): any => {
  return {
    fieldname: "file",
    originalname: filename,
    encoding: "7bit",
    mimetype,
    size,
    buffer: Buffer.from("mock file content"),
    destination: "/tmp",
    filename: `${Date.now()}-${filename}`,
    path: `/tmp/${Date.now()}-${filename}`
  };
};

/**
 * Generates test data for bulk operations
 */
export const generateBulkTestData = <T>(
  factory: (index: number) => T,
  count: number
): T[] => {
  return Array.from({ length: count }, (_, index) => factory(index));
};

/**
 * Asserts async function throws specific error type
 */
export const expectAsyncError = async <E extends Error>(
  fn: () => Promise<any>,
  errorType: new (...args: any[]) => E,
  messagePattern?: string | RegExp
): Promise<void> => {
  try {
    await fn();
    throw new Error("Expected function to throw an error");
  } catch (error) {
    expect(error).toBeInstanceOf(errorType);
    if (messagePattern) {
      if (typeof messagePattern === "string") {
        expect((error as Error).message).toContain(messagePattern);
      } else {
        expect((error as Error).message).toMatch(messagePattern);
      }
    }
  }
};

/**
 * Creates a mock JWT token for testing
 */
export const createMockJWT = (payload: any = {}): string => {
  // This is a mock JWT that looks valid but isn't actually signed
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64");
  const payloadStr = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() / 1000 + 3600 })
  ).toString("base64");
  const signature = "mock-signature";
  return `${header}.${payloadStr}.${signature}`;
};

/**
 * Verifies that all expected methods were called in order
 */
export const expectCallOrder = (mocks: jest.Mock[]): void => {
  const callTimes = mocks.map((mock) => {
    const invocations = mock.mock.invocationCallOrder;
    return invocations.length > 0 ? Math.min(...invocations) : Infinity;
  });

  for (let i = 1; i < callTimes.length; i++) {
    expect(callTimes[i]).toBeGreaterThan(callTimes[i - 1]);
  }
};

/**
 * Creates a mock logger for testing
 */
export const createMockLogger = () => {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };
};

/**
 * Asserts that a value is within a range
 */
export const expectInRange = (
  value: number,
  min: number,
  max: number
): void => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

/**
 * Creates a mock S3 client for file upload testing
 */
export const createMockS3 = () => {
  return {
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: "https://s3.amazonaws.com/bucket/key",
        Key: "key",
        Bucket: "bucket"
      })
    }),
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from("file content")
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  };
};
