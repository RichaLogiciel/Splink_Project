// import { ENTITY_TYPE } from "@/config/appConstants";
// import { ERROR_MESSAGES } from "@/config/errorMessages";
// import StoreRepository from "@/repositories/StoreRepository";
// import StoreDashboardService from "@/services/StoreDashboardService";
// import StoreService from "@/services/StoreService";
// import { Request, Response } from "express";
// import ChainController from "../../controllers/ChainController";
// import { createMockRequestResponse } from "../helpers/test-utils";

// describe("Chain Integration Tests", () => {
//   let mockReq: Partial<Request>;
//   let mockRes: Partial<Response>;

//   beforeEach(() => {
//     jest.resetAllMocks();
//     const { req, res } = createMockRequestResponse();
//     mockReq = req as Partial<Request>;
//     mockRes = res as Partial<Response>;
//   });

//   describe("getChainKeyMetrics", () => {
//     it("should successfully get chain key metrics", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       const mockChainStores = [
//         {
//           id: 1,
//           name: "Store 1",
//           address: "Address 1",
//           city: "City 1",
//           state: "State 1",
//           zip: "12345",
//           parentEntityId: 1
//         }
//       ] as any;

//       const mockKeyMetrics = {
//         TotalSavingsCardData: {
//           yoyValue: 0,
//           info: "Total amount through November 6th, 2024",
//           value: 4,
//           footerInfo: "Next Withdrawal Date December 1, 2024",
//           link: {
//             label: "Withdraw Funds",
//             href: "/"
//           }
//         },
//         TotalManufacturer: {
//           value: 18
//         },
//         TotalTier: {
//           value: 108
//         },
//         TierAchievedData: {
//           value: 0
//         }
//       };

//       jest
//         .spyOn(StoreRepository, "getStoresByChainId")
//         .mockResolvedValue(mockChainStores);
//       jest
//         .spyOn(StoreDashboardService, "getStoreKeyMetrics")
//         .mockResolvedValue(mockKeyMetrics);

//       await ChainController.getChainKeyMetrics(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(200);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "success",
//         data: mockKeyMetrics
//       });
//     });

//     it("should handle missing associatedUserId", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: undefined,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       jest
//         .spyOn(StoreRepository, "getStoresByChainId")
//         .mockRejectedValue(new Error(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID));

//       await ChainController.getChainKeyMetrics(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(500);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
//       });
//     });

//     it("should handle service error", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       jest
//         .spyOn(StoreRepository, "getStoresByChainId")
//         .mockRejectedValue(new Error("Service error"));

//       await ChainController.getChainKeyMetrics(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(500);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: "Service error"
//       });
//     });
//   });

//   describe("getStores", () => {
//     it("should successfully get stores for a chain", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };

//       const mockStores = [
//         {
//           id: 1,
//           name: "Store 1",
//           address: "Address 1"
//         }
//       ] as any;

//       jest
//         .spyOn(StoreRepository, "getStoresByChainId")
//         .mockResolvedValue(mockStores);

//       await ChainController.getStores(mockReq as Request, mockRes as Response);

//       expect(mockRes.status).toHaveBeenCalledWith(200);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "success",
//         data: mockStores
//       });
//     });

//     it("should handle missing associatedUserId", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: undefined,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };

//       await ChainController.getStores(mockReq as Request, mockRes as Response);

//       expect(mockRes.status).toHaveBeenCalledWith(400);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
//       });
//     });

//     it("should handle service error", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };

//       jest
//         .spyOn(StoreRepository, "getStoresByChainId")
//         .mockRejectedValue(new Error("Service error"));

//       await ChainController.getStores(mockReq as Request, mockRes as Response);

//       expect(mockRes.status).toHaveBeenCalledWith(500);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: "Service error"
//       });
//     });
//   });

//   describe("getStoresListing", () => {
//     it("should successfully get stores listing with default parameters", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       const mockStoresListing = {
//         stores: [
//           {
//             id: 1,
//             name: "Store 1",
//             address: "Address 1"
//           }
//         ],
//         pagination: {
//           currentPage: 1,
//           totalPages: 1,
//           totalStores: 1,
//           limit: 10
//         }
//       };

//       jest
//         .spyOn(StoreService, "getListing")
//         .mockResolvedValue(mockStoresListing);

//       await ChainController.getStoresListing(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(200);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "success",
//         data: mockStoresListing
//       });
//     });

//     it("should successfully get stores listing with search and sort parameters", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {
//         search: "Store",
//         sort: "name",
//         sortKey: "name",
//         page: "1",
//         limit: "10"
//       };

//       const mockStoresListing = {
//         stores: [
//           {
//             id: 1,
//             name: "Store 1",
//             address: "Address 1"
//           }
//         ],
//         pagination: {
//           currentPage: 1,
//           totalPages: 1,
//           totalStores: 1,
//           limit: 10
//         }
//       };

//       jest
//         .spyOn(StoreService, "getListing")
//         .mockResolvedValue(mockStoresListing);

//       await ChainController.getStoresListing(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(200);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "success",
//         data: mockStoresListing
//       });
//     });

//     it("should handle missing associatedUserId", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: undefined,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       await ChainController.getStoresListing(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(404);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
//       });
//     });

//     it("should handle service error", async () => {
//       mockReq.user = {
//         id: 1,
//         role: ENTITY_TYPE.CHAIN_ADMIN,
//         associatedUserId: 72,
//         parentEntityId: 1,
//         parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
//       };
//       mockReq.query = {};

//       jest
//         .spyOn(StoreService, "getListing")
//         .mockRejectedValue(new Error("Service error"));

//       await ChainController.getStoresListing(
//         mockReq as Request,
//         mockRes as Response
//       );

//       expect(mockRes.status).toHaveBeenCalledWith(500);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         status: "error",
//         data: "Service error"
//       });
//     });
//   });
// });
