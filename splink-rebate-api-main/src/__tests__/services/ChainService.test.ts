import ChainService from "../../services/ChainService";

describe("ChainService", () => {
  describe("getChainProgramDetails", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainService.getChainProgramDetails).toBe("function");
    });
  });

  describe("getChainCategorizedProducts", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainService.getChainCategorizedProducts).toBe("function");
    });
  });

  describe("getChainsByDistributor", () => {
    it("should exist and be a function", () => {
      expect(typeof ChainService.getChainsByDistributor).toBe("function");
    });
  });

  describe("Service Methods", () => {
    it("should have all required methods", () => {
      expect(ChainService).toBeDefined();
      expect(ChainService.getChainProgramDetails).toBeDefined();
      expect(ChainService.getChainCategorizedProducts).toBeDefined();
      expect(ChainService.getChainsByDistributor).toBeDefined();
    });
  });
});
