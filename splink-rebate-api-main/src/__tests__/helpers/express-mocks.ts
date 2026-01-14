// src/__tests__/helpers/express-mocks.ts
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Application } from "express";
import { Request, Response } from "express";

// Create a mock server
const mockServer = {
  close: jest.fn((callback) => callback && callback())
};

// Create mock app
const mockApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn().mockReturnValue(mockServer),
  close: jest.fn(),
  address: jest.fn().mockReturnValue({
    port: 3000,
    family: "IPv4",
    address: "127.0.0.1"
  })
} as unknown as Application;

// Mock express
jest.mock("express", () => ({
  __esModule: true,
  default: jest.fn(() => mockApp)
}));

// Create very direct mocking of supertest
const supertestMock = {
  __esModule: true,
  default: (app: Application) => {
    console.log("[MOCK] supertest initialized");

    const buildRequest = (method: string, path: string) => {
      console.log(`[MOCK] Building ${method} request for ${path}`);

      return {
        query: (params: any) => ({
          set: (headers: any) => ({
            end: (callback: any) => {
              console.log(`[MOCK] Handling ${method} ${path}`);
              console.log("[MOCK] Query params:", params);
              console.log("[MOCK] Headers:", headers);

              // Handle manufacturer store listing
              if (
                path.includes("/api/v1/manufacturer/") &&
                path.includes("/store/listing")
              ) {
                console.log("[MOCK] Matched manufacturer store listing route");
                const manufacturerId = path.split("/")[4];
                console.log("[MOCK] Manufacturer ID:", manufacturerId);

                const ManufacturerController =
                  require("../../controllers/ManufacturerController").default;

                // Create mock req/res objects
                const req: any = {
                  path,
                  params: { id: manufacturerId },
                  query: params,
                  headers,
                  method,
                  user: headers.Authorization ? { id: 1 } : null
                };

                let responseStatus = 200;
                let responseBody = {};

                const res: any = {
                  status: (code: number) => {
                    responseStatus = code;
                    return res;
                  },
                  json: (data: any) => {
                    responseBody = data;
                    return res;
                  }
                };

                try {
                  ManufacturerController.getStoresListing(req, res);
                  console.log(
                    "[MOCK] Controller response:",
                    responseStatus,
                    responseBody
                  );
                  return callback(null, {
                    status: responseStatus,
                    body: responseBody
                  });
                } catch (err) {
                  console.error("[MOCK] Controller error:", err);
                  return callback(null, {
                    status: 500,
                    body: { error: "Controller error" }
                  });
                }
              }

              // Default: return 404
              console.log("[MOCK] No route matched");
              return callback(null, {
                status: 404,
                body: { message: "Not found", path }
              });
            }
          })
        })
      };
    };

    return {
      get: (path: string) => buildRequest("GET", path),
      post: (path: string) => buildRequest("POST", path),
      put: (path: string) => buildRequest("PUT", path),
      delete: (path: string) => buildRequest("DELETE", path)
    };
  }
};

// Mock supertest
jest.mock("supertest", () => supertestMock);

export { mockApp as app, mockServer as server };
