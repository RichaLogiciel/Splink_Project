import { ENTITY_TYPE } from "../../config/appConstants";
import DistributorController from "../../controllers/DistributorController";
import StoreController from "../../controllers/StoreController";
import ProgramController from "../../controllers/ProgramController";
import DistributorRepository from "../../repositories/DistributorRepository";
import DistributorService from "../../services/DistributorService";
import ProgramService from "../../services/ProgramService";
import { createMockRequestResponse } from "../helpers/test-utils";

jest.mock("../../repositories/DistributorRepository", () => ({
  __esModule: true,
  default: {
    getWarehouseIds: jest.fn(),
    getWarehouseIdsByGeneralManager: jest.fn()
  }
}));

jest.mock("../../services/DistributorService", () => ({
  __esModule: true,
  default: {
    getSalesRepEarnings: jest.fn(),
    getProgramsEnrollment: jest.fn(),
    getDistributorStoreEarnings: jest.fn()
  }
}));

jest.mock("../../services/ProgramService", () => ({
  __esModule: true,
  default: {
    getVoidFillProgramsSummary: jest.fn()
  }
}));

jest.mock("../../services/StoreService", () => ({
  __esModule: true,
  default: {
    getDistributorSalesRepsByGeneralManager: jest.fn()
  }
}));

describe("General Manager warehouse scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /dashboard/sales-rep-earnings forces GM to assigned warehouse", async () => {
    (
      DistributorRepository.getWarehouseIdsByGeneralManager as jest.Mock
    ).mockResolvedValue([111]);
    (DistributorService.getSalesRepEarnings as jest.Mock).mockResolvedValue({
      totalSalesReps: 0,
      totalEarnings: "0.00",
      salesRepData: []
    });

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999,
        id: 123
      }
    });

    await DistributorController.getSalesRepEarnings(req as any, res as any);

    expect(
      DistributorRepository.getWarehouseIdsByGeneralManager
    ).toHaveBeenCalledWith({
      generalManagerUserId: 55,
      fetchWarehouseName: false
    });
    expect(DistributorService.getSalesRepEarnings).toHaveBeenCalledWith(
      expect.objectContaining({
        parentEntityId: 999,
        selectedWarehouseId: 111
      })
    );
  });

  it("GET /dashboard/sales-rep-earnings rejects GM requesting a different warehouse", async () => {
    (DistributorRepository.getWarehouseIds as jest.Mock).mockResolvedValue([
      111
    ]);

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999,
        id: 123
      },
      query: {
        warehouseId: "222"
      }
    });

    await DistributorController.getSalesRepEarnings(req as any, res as any);

    expect(DistributorService.getSalesRepEarnings).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("GET /stores/distributor-sales-reps returns GM-scoped sales reps", async () => {
    const StoreService = require("../../services/StoreService").default;
    (
      StoreService.getDistributorSalesRepsByGeneralManager as jest.Mock
    ).mockResolvedValue({
      salesReps: [{ id: "SR-1", name: "Alice", associatedUserId: 1 }]
    });

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999,
        id: 123
      },
      params: { distributorId: "999" }
    });

    await StoreController.getDistributorSalesReps(req as any, res as any);

    expect(
      StoreService.getDistributorSalesRepsByGeneralManager
    ).toHaveBeenCalledWith(55);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        data: {
          salesReps: [{ id: "SR-1", name: "Alice", associatedUserId: 1 }]
        }
      })
    );
  });

  it("GET /dashboard/store-program-enrollment forces GM to assigned warehouse", async () => {
    (DistributorRepository.getWarehouseIds as jest.Mock).mockResolvedValue([
      111
    ]);
    (DistributorService.getProgramsEnrollment as jest.Mock).mockResolvedValue({
      data: []
    });

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999
      }
    });

    await DistributorController.getProgramsEnrollment(req as any, res as any);

    expect(
      DistributorRepository.getWarehouseIdsByGeneralManager
    ).toHaveBeenCalledWith({
      generalManagerUserId: 55,
      fetchWarehouseName: false
    });
    expect(DistributorService.getProgramsEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        distributorId: 999,
        selectedWarehouseId: 111
      })
    );
  });

  it("GET /dashboard/distributor-store-earnings forces GM to assigned warehouse", async () => {
    (
      DistributorRepository.getWarehouseIdsByGeneralManager as jest.Mock
    ).mockResolvedValue([111]);
    (
      DistributorService.getDistributorStoreEarnings as jest.Mock
    ).mockResolvedValue({
      totalEarnings: 0,
      topStores: []
    });

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999,
        id: 123
      }
    });

    await DistributorController.getDistributorStoreEarnings(
      req as any,
      res as any
    );

    expect(DistributorRepository.getWarehouseIds).toHaveBeenCalledWith(
      999,
      55,
      true
    );
    expect(DistributorService.getDistributorStoreEarnings).toHaveBeenCalledWith(
      999,
      "storeEarnings",
      "DESC",
      "111",
      "Current"
    );
  });

  it("POST /programs/get-void-fill-programs-summary forces GM to assigned warehouse", async () => {
    (
      DistributorRepository.getWarehouseIdsByGeneralManager as jest.Mock
    ).mockResolvedValue([111]);
    (ProgramService.getVoidFillProgramsSummary as jest.Mock).mockResolvedValue({
      voidFillDetails: [],
      warehouseIds: [],
      programs: []
    });

    const { req, res } = createMockRequestResponse({
      user: {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        associatedUserId: 55,
        parentEntityId: 999
      },
      body: {
        // no warehouseId provided
        warehouseIdFilter: false
      }
    });

    await ProgramController.GetVoidFillProgramsSummary(req as any, res as any);

    expect(
      DistributorRepository.getWarehouseIdsByGeneralManager
    ).toHaveBeenCalledWith({
      generalManagerUserId: 55,
      fetchWarehouseName: false
    });
    expect(ProgramService.getVoidFillProgramsSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        distributorId: 999,
        warehouseId: 111,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      })
    );
  });
});
