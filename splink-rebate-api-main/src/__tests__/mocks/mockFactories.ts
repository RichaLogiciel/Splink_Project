/**
 * Mock Data Factories
 *
 * Factory functions for creating test data for all major domain entities.
 * Use these factories to create consistent, realistic test data.
 */

import { generateId, generateEmail, pastDate, futureDate, formatDate } from '../utils/testHelpers';

// ============================================================================
// User Mocks
// ============================================================================

export interface MockUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  manufacturerId?: number;
  distributorId?: number;
  chainId?: number;
  storeId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => {
  const id = overrides.id || generateId();
  return {
    id,
    email: overrides.email || generateEmail(),
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'store',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    manufacturerId: overrides.manufacturerId,
    distributorId: overrides.distributorId,
    chainId: overrides.chainId,
    storeId: overrides.storeId,
    ...overrides,
  };
};

export const createMockManufacturerUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return createMockUser({
    role: 'manufacturer',
    manufacturerId: overrides.manufacturerId || generateId(),
    ...overrides,
  });
};

export const createMockDistributorUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return createMockUser({
    role: 'distributor',
    distributorId: overrides.distributorId || generateId(),
    ...overrides,
  });
};

export const createMockStoreUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return createMockUser({
    role: 'store',
    storeId: overrides.storeId || generateId(),
    ...overrides,
  });
};

export const createMockChainUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return createMockUser({
    role: 'chain',
    chainId: overrides.chainId || generateId(),
    ...overrides,
  });
};

export const createMockSalesRepUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return createMockUser({
    role: 'sales_rep',
    ...overrides,
  });
};

// ============================================================================
// Program Mocks
// ============================================================================

export interface MockProgram {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'pending_approval' | 'active' | 'inactive' | 'completed';
  startDate: string;
  endDate: string;
  manufacturerId: number;
  programType: 'rebate' | 'incentive' | 'promotion';
  participantType: 'stores' | 'chains' | 'both';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockProgram = (overrides: Partial<MockProgram> = {}): MockProgram => {
  const id = overrides.id || generateId();
  const startDate = overrides.startDate || formatDate(pastDate(30));
  const endDate = overrides.endDate || formatDate(futureDate(90));

  return {
    id,
    name: overrides.name || `Test Program ${id}`,
    description: overrides.description || 'A test program for testing purposes',
    status: overrides.status || 'active',
    startDate,
    endDate,
    manufacturerId: overrides.manufacturerId || generateId(),
    programType: overrides.programType || 'rebate',
    participantType: overrides.participantType || 'stores',
    isPublic: overrides.isPublic !== undefined ? overrides.isPublic : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

export const createMockProgramWithTiers = (overrides: Partial<any> = {}): any => {
  const program = createMockProgram(overrides);
  return {
    ...program,
    tiers: [
      {
        id: generateId(),
        programId: program.id,
        name: 'Bronze',
        minPurchaseAmount: 1000,
        maxPurchaseAmount: 4999,
        rebatePercentage: 5,
        rebateAmount: null,
        orderIndex: 1,
      },
      {
        id: generateId(),
        programId: program.id,
        name: 'Silver',
        minPurchaseAmount: 5000,
        maxPurchaseAmount: 9999,
        rebatePercentage: 10,
        rebateAmount: null,
        orderIndex: 2,
      },
      {
        id: generateId(),
        programId: program.id,
        name: 'Gold',
        minPurchaseAmount: 10000,
        maxPurchaseAmount: null,
        rebatePercentage: 15,
        rebateAmount: null,
        orderIndex: 3,
      },
    ],
  };
};

// ============================================================================
// Store Mocks
// ============================================================================

export interface MockStore {
  id: number;
  name: string;
  storeNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  distributorId: number;
  chainId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockStore = (overrides: Partial<MockStore> = {}): MockStore => {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Store ${id}`,
    storeNumber: overrides.storeNumber || `STORE-${id}`,
    address: overrides.address || `${id} Test St`,
    city: overrides.city || 'Test City',
    state: overrides.state || 'CA',
    zipCode: overrides.zipCode || '90210',
    phone: overrides.phone || '555-0100',
    distributorId: overrides.distributorId || generateId(),
    chainId: overrides.chainId,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

export const createMockStoreWithSalesRep = (overrides: Partial<any> = {}): any => {
  const store = createMockStore(overrides);
  return {
    ...store,
    salesRep: {
      id: generateId(),
      firstName: 'John',
      lastName: 'Doe',
      email: generateEmail(),
      phone: '555-0200',
    },
  };
};

// ============================================================================
// Chain Mocks
// ============================================================================

export interface MockChain {
  id: number;
  name: string;
  chainCode: string;
  storeCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockChain = (overrides: Partial<MockChain> = {}): MockChain => {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Chain ${id}`,
    chainCode: overrides.chainCode || `CHAIN-${id}`,
    storeCount: overrides.storeCount || 10,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

export const createMockChainWithStores = (
  storeCount: number = 3,
  overrides: Partial<MockChain> = {}
): any => {
  const chain = createMockChain({ ...overrides, storeCount });
  return {
    ...chain,
    stores: Array.from({ length: storeCount }, (_, index) =>
      createMockStore({ chainId: chain.id, name: `${chain.name} Store ${index + 1}` })
    ),
  };
};

// ============================================================================
// Distributor Mocks
// ============================================================================

export interface MockDistributor {
  id: number;
  name: string;
  distributorCode: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockDistributor = (overrides: Partial<MockDistributor> = {}): MockDistributor => {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Distributor ${id}`,
    distributorCode: overrides.distributorCode || `DIST-${id}`,
    address: overrides.address || `${id} Distribution Way`,
    city: overrides.city || 'Test City',
    state: overrides.state || 'CA',
    zipCode: overrides.zipCode || '90210',
    phone: overrides.phone || '555-0300',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

// ============================================================================
// Manufacturer Mocks
// ============================================================================

export interface MockManufacturer {
  id: number;
  name: string;
  manufacturerCode: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockManufacturer = (overrides: Partial<MockManufacturer> = {}): MockManufacturer => {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Manufacturer ${id}`,
    manufacturerCode: overrides.manufacturerCode || `MFR-${id}`,
    address: overrides.address || `${id} Manufacturing Blvd`,
    city: overrides.city || 'Test City',
    state: overrides.state || 'CA',
    zipCode: overrides.zipCode || '90210',
    phone: overrides.phone || '555-0400',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

// ============================================================================
// Product Mocks
// ============================================================================

export interface MockProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  manufacturerId: number;
  categoryId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockProduct = (overrides: Partial<MockProduct> = {}): MockProduct => {
  const id = overrides.id || generateId();
  return {
    id,
    sku: overrides.sku || `SKU-${id}`,
    name: overrides.name || `Test Product ${id}`,
    description: overrides.description || 'A test product',
    price: overrides.price || 99.99,
    manufacturerId: overrides.manufacturerId || generateId(),
    categoryId: overrides.categoryId || generateId(),
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

// ============================================================================
// Purchase Mocks
// ============================================================================

export interface MockPurchase {
  id: number;
  storeId: number;
  productId: number;
  programId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockPurchase = (overrides: Partial<MockPurchase> = {}): MockPurchase => {
  const id = overrides.id || generateId();
  const quantity = overrides.quantity || 10;
  const unitPrice = overrides.unitPrice || 50.00;
  const totalAmount = overrides.totalAmount || quantity * unitPrice;

  return {
    id,
    storeId: overrides.storeId || generateId(),
    productId: overrides.productId || generateId(),
    programId: overrides.programId || generateId(),
    quantity,
    unitPrice,
    totalAmount,
    purchaseDate: overrides.purchaseDate || pastDate(7),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

// ============================================================================
// Compliance Mocks
// ============================================================================

export interface MockCompliance {
  programId: number;
  storeId: number;
  totalPurchases: number;
  requiredPurchases: number;
  compliancePercentage: number;
  isCompliant: boolean;
  currentTier?: string;
  nextTier?: string;
}

export const createMockCompliance = (overrides: Partial<MockCompliance> = {}): MockCompliance => {
  const totalPurchases = overrides.totalPurchases || 7500;
  const requiredPurchases = overrides.requiredPurchases || 10000;
  const compliancePercentage = overrides.compliancePercentage || (totalPurchases / requiredPurchases * 100);
  const isCompliant = overrides.isCompliant !== undefined ? overrides.isCompliant : compliancePercentage >= 100;

  return {
    programId: overrides.programId || generateId(),
    storeId: overrides.storeId || generateId(),
    totalPurchases,
    requiredPurchases,
    compliancePercentage,
    isCompliant,
    currentTier: overrides.currentTier || 'Silver',
    nextTier: overrides.nextTier || 'Gold',
    ...overrides,
  };
};

// ============================================================================
// Order/Cart Mocks
// ============================================================================

export interface MockOrder {
  id: number;
  storeId: number;
  userId: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockOrder = (overrides: Partial<MockOrder> = {}): MockOrder => {
  const id = overrides.id || generateId();
  return {
    id,
    storeId: overrides.storeId || generateId(),
    userId: overrides.userId || generateId(),
    status: overrides.status || 'pending',
    totalAmount: overrides.totalAmount || 1500.00,
    orderDate: overrides.orderDate || new Date(),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

export interface MockOrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const createMockOrderItem = (overrides: Partial<MockOrderItem> = {}): MockOrderItem => {
  const id = overrides.id || generateId();
  const quantity = overrides.quantity || 5;
  const unitPrice = overrides.unitPrice || 50.00;
  const totalPrice = overrides.totalPrice || quantity * unitPrice;

  return {
    id,
    orderId: overrides.orderId || generateId(),
    productId: overrides.productId || generateId(),
    quantity,
    unitPrice,
    totalPrice,
    ...overrides,
  };
};

// ============================================================================
// Approval Mocks
// ============================================================================

export interface MockProgramApproval {
  id: number;
  programId: number;
  distributorId: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number;
  reviewedAt?: Date;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockProgramApproval = (
  overrides: Partial<MockProgramApproval> = {}
): MockProgramApproval => {
  const id = overrides.id || generateId();
  return {
    id,
    programId: overrides.programId || generateId(),
    distributorId: overrides.distributorId || generateId(),
    status: overrides.status || 'pending',
    reviewedBy: overrides.reviewedBy,
    reviewedAt: overrides.reviewedAt,
    comments: overrides.comments,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides,
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a complete program scenario with all related entities
 */
export const createProgramScenario = () => {
  const manufacturer = createMockManufacturer();
  const program = createMockProgramWithTiers({ manufacturerId: manufacturer.id });
  const distributor = createMockDistributor();
  const chain = createMockChain();
  const store = createMockStore({
    distributorId: distributor.id,
    chainId: chain.id,
  });
  const user = createMockStoreUser({ storeId: store.id });

  return {
    manufacturer,
    program,
    distributor,
    chain,
    store,
    user,
  };
};

/**
 * Creates a compliance scenario with purchases
 */
export const createComplianceScenario = () => {
  const scenario = createProgramScenario();
  const products = [
    createMockProduct({ manufacturerId: scenario.manufacturer.id }),
    createMockProduct({ manufacturerId: scenario.manufacturer.id }),
    createMockProduct({ manufacturerId: scenario.manufacturer.id }),
  ];

  const purchases = products.map((product) =>
    createMockPurchase({
      storeId: scenario.store.id,
      productId: product.id,
      programId: scenario.program.id,
      quantity: 20,
      unitPrice: product.price,
    })
  );

  const compliance = createMockCompliance({
    programId: scenario.program.id,
    storeId: scenario.store.id,
    totalPurchases: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
  });

  return {
    ...scenario,
    products,
    purchases,
    compliance,
  };
};
