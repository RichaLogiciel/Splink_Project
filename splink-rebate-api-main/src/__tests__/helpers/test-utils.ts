// @typescript-eslint/no-empty-object-type
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";

export const createMockToken = (userData: any) => {
  return jwt.sign(userData, process.env.JWT_SECRET || "test-secret", {
    expiresIn: "1h"
  });
};

export const createMockUser = (
  role: string = ENTITY_TYPE.DISTRIBUTOR_ADMIN
) => ({
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: role,
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
});

export const createMockProgram = (overrides = {}) => ({
  manufacturerName: "Test Manufacturer",
  manufacturerLogo: "http://example.com/logo.png",
  manufacturerId: 1,
  totalPurchaseVolume: 1000,
  totalSaving: 200,
  program_overview: [
    {
      id: 1,
      name: "Test Program",
      programType: "Type A",
      programTerms: "Terms",
      programHeader: "Header",
      compliances: [],
      programEntityType: ENTITY_TYPE.DISTRIBUTOR,
      programDetails: [
        {
          id: 1,
          tier: 1,
          min_qty: "10",
          rebate_type: "percentage",
          rebate_calculation: "10%",
          program_id: 1,
          overview: "Overview"
        }
      ]
    }
  ],
  ...overrides
});

export const createMockRequestResponse = (
  options: {
    token?: string;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    user?: Record<string, unknown>;
  } = {}
) => {
  const req = {
    headers: {
      authorization: options.token ? `Bearer ${options.token}` : undefined
    },
    query: options.query || {},
    params: options.params || {},
    body: options.body || {},
    user: options.user || {}
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };

  return { req, res };
};
