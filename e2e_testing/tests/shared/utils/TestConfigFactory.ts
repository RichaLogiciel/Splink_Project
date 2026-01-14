import StoreDetailsPageBase from '../../../pages/shared/StoreDetailsPageBase';
import StorePageBase from '../../../pages/shared/StorePageBase';
import StoreProgramDetailPageBase from '../../../pages/shared/StoreProgramDetailPageBase';
import { ENTITY_TYPE, PROGRAM_TIMELINE_TO_TEST } from '../../../utils/constant';
import {
  distributorMap,
  manufacturerMap,
  salesRepManagerMap,
  salesRepMap,
} from '../../../utils/userMap';
import { TestConfig } from '../types/TestConfig';

export class TestConfigFactory {
  static createSalesRepConfig(userKey: string): TestConfig {
    const userData = salesRepMap.get(userKey);
    if (!userData) {
      throw new Error(`Sales Rep with key ${userKey} not found`);
    }

    return {
      entityType: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
      userMap: salesRepMap,
      userKey,
      userData,
      pageClasses: {
        storePage: StorePageBase,
        storeDetailsPage: StoreDetailsPageBase,
        storeProgramDetailPage: StoreProgramDetailPageBase,
        programPage: require('../../../pages/sales-rep/ProgramPage'),
      },
      navigationConfig: {
        storePageUrl: 'app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST,
        programPageUrl: 'app/programs',
        storeProgramPageUrl: 'app/programs/store',
      },
      timeout: 100000,
    };
  }

  static createSalesRepManagerConfig(userKey: string): TestConfig {
    const userData = salesRepManagerMap.get(userKey);
    if (!userData) {
      throw new Error(`Sales Rep Manager with key ${userKey} not found`);
    }

    return {
      entityType: ENTITY_TYPE.SALES_REP_MANAGER,
      userMap: salesRepManagerMap,
      userKey,
      userData,
      pageClasses: {
        storePage: StorePageBase,
        storeDetailsPage: StoreDetailsPageBase,
        storeProgramDetailPage: StoreProgramDetailPageBase,
        programPage: require('../../../pages/distributor-admin/ProgramPage'),
      },
      navigationConfig: {
        storePageUrl: 'app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST,
        programPageUrl: 'app/programs',
        storeProgramPageUrl: 'app/programs/store',
      },
      timeout: 100000,
    };
  }

  static createDistributorAdminConfig(userKey: string): TestConfig {
    const userData = distributorMap.get(userKey);
    if (!userData) {
      throw new Error(`Distributor Admin with key ${userKey} not found`);
    }

    return {
      entityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
      userMap: distributorMap,
      userKey,
      userData,
      pageClasses: {
        storePage: StorePageBase,
        storeDetailsPage: StoreDetailsPageBase,
        storeProgramDetailPage: StoreProgramDetailPageBase,
        programPage: require('../../../pages/distributor-admin/ProgramPage'),
      },
      navigationConfig: {
        storePageUrl: 'app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST,
        programPageUrl: 'app/programs',
        storeProgramPageUrl: 'app/programs/store',
      },
      timeout: 100000,
    };
  }

  static createManufacturerAdminConfig(userKey: string): TestConfig {
    const userData = manufacturerMap.get(userKey);
    if (!userData) {
      throw new Error(`Manufacturer Admin with key ${userKey} not found`);
    }

    return {
      entityType: ENTITY_TYPE.MANUFACTURER,
      userMap: manufacturerMap,
      userKey,
      userData,
      pageClasses: {
        storePage: StorePageBase,
        storeDetailsPage: StoreDetailsPageBase,
        storeProgramDetailPage: StoreProgramDetailPageBase,
        programPage: require('../../../pages/manufacturer-admin/ProgramPage'),
      },
      navigationConfig: {
        storePageUrl: 'app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST,
        programPageUrl: 'app/programs',
        storeProgramPageUrl: 'app/programs/store',
      },
      timeout: 100000,
    };
  }
}
