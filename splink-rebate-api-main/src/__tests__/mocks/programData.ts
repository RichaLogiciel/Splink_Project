import { ENTITY_TYPE } from "../../config/appConstants";

export const mockDistributorProgram = {
  id: 1,
  name: "Test Program",
  programType: "TIER",
  participantType: ENTITY_TYPE.DISTRIBUTOR,
  paymentTerm: "30 days",
  programHeader: "Test Header",
  Manufacturer: {
    id: 1,
    name: "Test Manufacturer"
  },
  ProgramDetails: [
    {
      id: 1,
      program_id: 1,
      tier: 1,
      rebateType: "percentage",
      rebatePercentage: 10,
      rebateAmount: null,
      rebateCalculation: "volume",
      description: "Test Description"
    }
  ]
};

export const mockStoreProgram = {
  ...mockDistributorProgram,
  participantType: ENTITY_TYPE.STORE
};

export const mockProduct = {
  id: 1,
  name: "Test Product",
  description: "Test Description",
  is_core_product: true,
  manufacturer_id: 1,
  tags: ["tag1"],
  get: (key: string) => {
    const data: { [key: string]: any } = {
      manufacturer_id: 1
    };
    return data[key];
  }
};

export const mockProgram = {
  id: 1,
  name: "Test Program",
  program_type: "TIER",
  participant_type: ENTITY_TYPE.STORE,
  payment_term: "30 days",
  program_header: "Test Header",
  program_detail_id: 1,
  products_tags: "tag1, tag2",
  get: (options: { plain: boolean }) => {
    if (options.plain) {
      return {
        id: 1,
        name: "Test Program",
        program_type: "TIER",
        participant_type: ENTITY_TYPE.STORE,
        payment_term: "30 days",
        program_header: "Test Header"
      };
    }
    return mockProgram;
  }
};
