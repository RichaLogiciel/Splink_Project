import ChainRepository from "../../repositories/ChainRepository";
import sequelize from "../../db";
import { ApiError } from "../../lib/errors/APIError";

// Mock sequelize
jest.mock("../../db");

// Mock the models and their associations
jest.mock("../../models/Chain", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));

jest.mock("../../models/Store", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../models/ProgramParticipant", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../models/ChainStore", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../models/UserRole", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../models/User", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../models/ProgramCompliance", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

// Mock sequelize Op
jest.mock("sequelize", () => ({
  ...jest.requireActual("sequelize"),
  Op: {
    iLike: "ILIKE",
    and: "AND",
    or: "OR"
  }
}));

const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;
const mockQuery = jest.fn();
mockSequelize.query = mockQuery;

describe("ChainRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
  });

  describe("getChainsByDistributorId", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainRepository.getChainsByDistributorId).toBe("function");
    });

    it("should handle valid parameters", async () => {
      const Chain = require("../../models/Chain").default;
      Chain.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await ChainRepository.getChainsByDistributorId(1, {
        page: 1,
        limit: 10,
        searchQuery: "test",
        sort: "ASC",
        sortKey: "chain_name",
        programTimeline: "current",
        isInternal: false
      });

      expect(result).toBeDefined();
      expect(Chain.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe("getEnrolledChainsByProgram", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainRepository.getEnrolledChainsByProgram).toBe(
        "function"
      );
    });

    it("should handle valid parameters", async () => {
      const Chain = require("../../models/Chain").default;
      Chain.findAll.mockResolvedValue([]);

      const result = await ChainRepository.getEnrolledChainsByProgram(1, {});

      expect(result).toBeDefined();
      expect(Chain.findAll).toHaveBeenCalled();
    });
  });

  describe("getUnenrolledChainsByProgram", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainRepository.getUnenrolledChainsByProgram).toBe(
        "function"
      );
    });

    it("should handle valid parameters", async () => {
      const Chain = require("../../models/Chain").default;
      const ProgramParticipant =
        require("../../models/ProgramParticipant").default;
      ProgramParticipant.findAll.mockResolvedValue([
        { entityId: 1 },
        { entityId: 2 }
      ]);
      Chain.findAll.mockResolvedValue([]);

      const result = await ChainRepository.getUnenrolledChainsByProgram(1, {});

      expect(result).toBeDefined();
      expect(Chain.findAll).toHaveBeenCalled();
      expect(ProgramParticipant.findAll).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const Chain = require("../../models/Chain").default;
      Chain.findAndCountAll.mockRejectedValue(new Error("Database error"));

      await expect(
        ChainRepository.getChainsByDistributorId(1, {
          page: 1,
          limit: 10,
          searchQuery: "",
          sort: "ASC",
          sortKey: "chain_name",
          programTimeline: "current",
          isInternal: false
        })
      ).rejects.toThrow(ApiError);
    });
  });
});
