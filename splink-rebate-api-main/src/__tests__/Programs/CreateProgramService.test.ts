// Mock model imports must come before any other imports
jest.mock("../../models/Program", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    hasMany: jest.fn(),
    unscoped: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null)
    })
  }
}));

jest.mock("../../models/ProgramDetail", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/Wishlists", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/Manufacturer", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/ExcludedDistributorPrograms", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/Chain", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../../models/ChainStore", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../../models/Distributor", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../../models/Store", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  }
}));

jest.mock("../../models/UserRole", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn().mockResolvedValue({ parent_entity_id: 3 }),
    findAll: jest
      .fn()
      .mockResolvedValue([{ associatedUserId: 1 }, { associatedUserId: 2 }])
  }
}));

jest.mock("../../models/ProgramApproval", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/ProgramVisibility", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../models/LineItem", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../../db", () => {
  const mockCommit = jest.fn().mockResolvedValue(undefined);
  const mockRollback = jest.fn().mockResolvedValue(undefined);

  return {
    __esModule: true,
    default: {
      transaction: jest.fn().mockResolvedValue({
        commit: mockCommit,
        rollback: mockRollback
      }),
      Op: {
        and: Symbol("and"),
        or: Symbol("or"),
        eq: Symbol("eq"),
        ne: Symbol("ne"),
        gte: Symbol("gte"),
        gt: Symbol("gt"),
        lte: Symbol("lte"),
        lt: Symbol("lt"),
        not: Symbol("not"),
        in: Symbol("in"),
        notIn: Symbol("notIn"),
        is: Symbol("is"),
        like: Symbol("like"),
        notLike: Symbol("notLike"),
        iLike: Symbol("iLike"),
        notILike: Symbol("notILike"),
        startsWith: Symbol("startsWith"),
        endsWith: Symbol("endsWith"),
        substring: Symbol("substring"),
        regexp: Symbol("regexp"),
        notRegexp: Symbol("notRegexp"),
        between: Symbol("between"),
        notBetween: Symbol("notBetween"),
        overlap: Symbol("overlap"),
        contains: Symbol("contains"),
        contained: Symbol("contained"),
        any: Symbol("any"),
        all: Symbol("all"),
        col: Symbol("col"),
        placeholder: Symbol("placeholder"),
        join: Symbol("join")
      }
    }
  };
});

jest.mock("../../repositories/ProgramRepository", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 1,
        ...data
      })
    )
  }
}));

jest.mock("../../repositories/ProgramDetailRepository", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 1,
        ...data
      })
    )
  }
}));

jest.mock("../../repositories/ProgramApprovalRepository", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 1,
        ...data
      })
    )
  }
}));

jest.mock("../../repositories/ProgramVisibilityRepository", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 1,
        ...data
      })
    )
  }
}));

jest.mock("../../repositories/StoreRepository", () => ({
  __esModule: true,
  default: {
    getAllStoresByDistributorId: jest
      .fn()
      .mockImplementation(() => Promise.resolve([{ id: 1 }, { id: 2 }]))
  }
}));

// Now import the real modules
import { Transaction } from "sequelize";

// Define a proper mock for the mockTransaction to fix the TypeScript errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let mockTransaction: Transaction;

// test.skip("skip all", () => {});

// describe.skip("CreateProgramService - Basic Tests", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();

//     mockTransaction = {
//       commit: jest.fn(),
//       rollback: jest.fn()
//     } as unknown as Transaction;
//   });

//   it("should properly set up all model mocks", () => {
//     // This test just verifies the test setup is working
//     expect(true).toBe(true);
//   });

//   it("handles execute for a valid program creation", async () => {
//     const validProgramData = {
//       name: "Test Program",
//       start_date: new Date(),
//       end_date: new Date(),
//       target_audience: TARGET_AUDIENCE.DISTRIBUTOR,
//       visibility_scope: VISIBILITY_SCOPE.ALL_DISTRIBUTORS,
//       participant_type: TARGET_AUDIENCE.DISTRIBUTOR,
//       program_type: "REBATE",
//       program_header: "Test Header",
//       payment_term: "30",
//       creator_id: 1,
//       creator_type: ENTITY_TYPE.MANUFACTURER,
//       approval_status: PROGRAM_APPROVAL_STATUS.DRAFT,
//       program_details: [
//         {
//           tier: 1,
//           min_qty: 10,
//           rebate_amount: 100,
//           rebate_type: "FIXED",
//           rebate_calculation: "PER_UNIT",
//           rebate_calculation_type: "FIXED",
//           criteria: "BASE"
//         }
//       ]
//     };

//     // Mock the service methods
//     jest
//       .spyOn(CreateProgramService, "isProgramExists")
//       .mockResolvedValue(false);
//     jest
//       .spyOn(CreateProgramService as any, "validateInput")
//       .mockResolvedValue(undefined);
//     jest
//       .spyOn(CreateProgramService as any, "createProgram")
//       .mockResolvedValue({ id: 1, name: "Test Program" });
//     jest
//       .spyOn(CreateProgramService as any, "createProgramDetails")
//       .mockResolvedValue([{ id: 1, programId: 1 }]);
//     jest
//       .spyOn(CreateProgramService as any, "createVisibilityAndApprovals")
//       .mockResolvedValue(undefined);

//     const result = await CreateProgramService.execute(validProgramData);

//     // Basic verification
//     expect(result).toBeDefined();
//     expect(result.program).toBeDefined();
//     expect(result.program.id).toEqual(1);
//   });
// });

// describe.skip("CreateProgramService - Test Handler Functions", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     mockTransaction = {
//       commit: jest.fn(),
//       rollback: jest.fn()
//     } as unknown as Transaction;
//   });

//   describe("handleSpecificStores", () => {
//     it("should create visibility entries and approvals for each store", async () => {
//       // Create proper mock ProgramDetail objects
//       const mockProgramDetails = [
//         {
//           id: 1,
//           programId: 1,
//           tier: 1,
//           minQty: 10,
//           maxQty: null,
//           rebateAmount: 100,
//           rebateType: "FIXED",
//           rebateCalculation: "PER_UNIT",
//           rebateCalculationType: "FIXED"
//         } as unknown as ProgramDetail
//       ];

//       const mockData = {
//         programId: 1,
//         programDetails: mockProgramDetails,
//         visibilityEntities: [
//           { entity_type: ENTITY_TYPE.STORE, entity_id: 1 },
//           { entity_type: ENTITY_TYPE.STORE, entity_id: 2 }
//         ],
//         creatorId: 1,
//         creatorType: ENTITY_TYPE.MANUFACTURER,
//         transaction: mockTransaction
//       };

//       // Mock getDistributorIdFromStoreId to return different IDs
//       jest
//         .spyOn(CreateProgramService, "getDistributorIdFromStoreId")
//         .mockResolvedValueOnce(3) // For first store
//         .mockResolvedValueOnce(4); // For second store

//       await CreateProgramService["handleSpecificStores"](mockData);

//       // Verify that the repository methods were called correctly
//       expect(ProgramVisibilityRepository.create).toHaveBeenCalledTimes(2);
//       expect(ProgramApprovalRepository.create).toHaveBeenCalledTimes(1);
//     });
//   });

//   describe("handleAllDistributors", () => {
//     it("should create approvals for all distributors", async () => {
//       // Create proper mock ProgramDetail objects
//       const mockProgramDetails = [
//         {
//           id: 1,
//           programId: 1,
//           tier: 1,
//           minQty: 10,
//           maxQty: null,
//           rebateAmount: 100,
//           rebateType: "FIXED",
//           rebateCalculation: "PER_UNIT",
//           rebateCalculationType: "FIXED"
//         } as unknown as ProgramDetail
//       ];

//       const mockData = {
//         programId: 1,
//         programDetails: mockProgramDetails,
//         creatorId: 1,
//         creatorType: ENTITY_TYPE.MANUFACTURER,
//         transaction: mockTransaction
//       };

//       await CreateProgramService["handleAllDistributors"](mockData);

//       // Should create approvals for each distributor
//       expect(ProgramApprovalRepository.create).toHaveBeenCalledTimes(2);
//     });
//   });

//   describe("handleSpecificDistributors", () => {
//     it("should create approvals for specific distributors", async () => {
//       const programId = 1;
//       // Create proper mock ProgramDetail objects
//       const programDetails = [
//         {
//           id: 1,
//           programId: 1,
//           tier: 1,
//           minQty: 10,
//           maxQty: null,
//           rebateAmount: 100,
//           rebateType: "FIXED",
//           rebateCalculation: "PER_UNIT",
//           rebateCalculationType: "FIXED"
//         } as unknown as ProgramDetail
//       ];

//       const visibilityEntities = [
//         { entity_type: ENTITY_TYPE.DISTRIBUTOR, entity_id: 1 },
//         { entity_type: ENTITY_TYPE.DISTRIBUTOR, entity_id: 2 }
//       ];

//       await CreateProgramService["handleSpecificDistributors"](
//         programId,
//         programDetails,
//         visibilityEntities,
//         mockTransaction
//       );

//       // Should create approvals for each distributor
//       expect(ProgramApprovalRepository.create).toHaveBeenCalledTimes(2);
//     });
//   });
// });
