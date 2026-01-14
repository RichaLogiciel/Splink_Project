export interface TestConfig {
  entityType:
    | 'MANUFACTURER'
    | 'DISTRIBUTOR_SALES_REP'
    | 'DISTRIBUTOR_ADMIN'
    | 'SALES_REP_MANAGER';
  userMap: Map<string, any>;
  userKey: string;
  userData: any;
  pageClasses: {
    storePage: any;
    storeDetailsPage: any;
    storeProgramDetailPage?: any;
    programPage?: any;
  };
  navigationConfig: {
    storePageUrl: string;
    programPageUrl?: string;
    storeProgramPageUrl?: string;
  };
  timeout?: number;
}
