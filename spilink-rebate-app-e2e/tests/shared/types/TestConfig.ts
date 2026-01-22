export interface TestConfig {
  entityType:
    | "MANUFACTURER"
    | "DISTRIBUTOR_SALES_REP"
    | "DISTRIBUTOR_ADMIN"
    | "SALES_REP_MANAGER" |
    string;
  userMap: Map<string, any>;
  userKey: string;
  userData: any;
  pageClasses: {
    storePage: any;
    storeDetailsPage: any;
    storeProgramDetailPage?: any;
    programPage?: any;
    storeSpiffPage?: any;
    storeSpiffDetailPage?: any;
  };
  navigationConfig: {
    storePageUrl: string;
    programPageUrl?: string;
    storeProgramPageUrl?: string;
  };
  timeout?: number;
}
