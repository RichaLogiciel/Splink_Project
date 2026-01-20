import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import {
  ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS,
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS,
  INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS,
  MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS,
  SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorFeatureEnabled } from "@/utils/helper";
import { isDistributorSalesRepManager } from "@/utils/rolesConditions";
import AccountIcon from "../icons/menus/account";
import DashboardIcon from "../icons/menus/dashboard";
import ProductInsights from "../icons/menus/productInsights";
import ProgramsIcon from "../icons/menus/programs";
import StoreAccount from "../icons/menus/store-account";
import StoresIcon from "../icons/menus/stores";
import UsersIcon from "../icons/menus/users";
import WishlistIcon from "../icons/menus/wishlist";
import { Menu } from "./index";

// Common menu entries
const usersMenu = {
  name: "Users",
  url: APP_ROUTES.users,
  icon: <UsersIcon />
};

const accountMenu = {
  name: "Account",
  url: APP_ROUTES.account,
  icon: <AccountIcon />
};

const programsMenu = {
  name: "Programs",
  url: APP_ROUTES.programs,
  icon: <ProgramsIcon />
};

const storeProgramsMenu = {
  name: "Programs",
  icon: <ProgramsIcon />,
  children: [
    {
      name: (() => {
        const user = getUserClient();
        const distributorId =
          user?.parentEntityId ?? user?.associatedUserId ?? null;
        return distributorId === 55 ? "Store Opportunities" : "Store Rebates";
      })(),
      url: APP_ROUTES.storePrograms
    },
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "SPIFFs", url: APP_ROUTES.programsSpiff }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [
          {
            name: "Internal Initiatives",
            url: APP_ROUTES.programsSpiffInternal
          }
        ]
      : [])
  ]
};

const storesMenu = (() => {
  const user = getUserClient();
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const isChainProgramsEnabled = isDistributorFeatureEnabled(
    distributorId,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  const isStoreProgrammingEnabled = isDistributorFeatureEnabled(
    distributorId,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // If chain programs are disabled, route directly to stores page
  if (!isChainProgramsEnabled) {
    return {
      name: "Stores",
      url: APP_ROUTES.store,
      icon: <StoresIcon />
    };
  }

  // If chain programs are enabled, show menu with children
  return {
    name: "Stores",
    icon: <StoresIcon />,
    children: [
      {
        name: "Retail",
        url: APP_ROUTES.store
      },
      ...(isStoreProgrammingEnabled
        ? [{ name: "Chain", url: APP_ROUTES.storeChains }]
        : [])
    ]
  };
})();

const salesRepStoresMenu = {
  name: "Stores",
  url: APP_ROUTES.store,
  icon: <StoresIcon />
};

const dashboardMenu = {
  name: "Dashboard",
  url: APP_ROUTES.dashboard,
  icon: <DashboardIcon />
};

const productInsightsMenu = {
  name: "Product Insights",
  url: APP_ROUTES.productInsights,
  icon: <ProductInsights />
};

const internalToolsMenu = {
  name: "Internal Tools",
  url: APP_ROUTES.distributorAdmin,
  icon: <ProductInsights />
};

export const SETTINGS_MENU = {
  [USER_ROLES.DISTRIBUTOR_ADMIN]: [usersMenu, accountMenu],
  [USER_ROLES.DISTRIBUTOR_EXECUTIVE]: [usersMenu, accountMenu],
  [USER_ROLES.MANUFACTURER]: [usersMenu, accountMenu],
  [USER_ROLES.MANUFACTURER_EXECUTIVE]: [usersMenu, accountMenu],
  [USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER]: [accountMenu],
  [USER_ROLES.STORE]: [accountMenu],
  [USER_ROLES.DISTRIBUTOR_SALES_REP]: [accountMenu],
  [USER_ROLES.DISTRIBUTOR_SALES_MANAGER]: [accountMenu],
  [USER_ROLES.SUPER_ADMIN]: [usersMenu, accountMenu],
  [USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER]: [accountMenu]
};

const distributorProgramsMenu = {
  name: "Programs",
  icon: <ProgramsIcon />,
  children: [
    ...(getUserClient()?.role !== USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER &&
    getUserClient()?.role !== USER_ROLES.DISTRIBUTOR_EXECUTIVE
      ? [
          {
            name: "Wholesale",
            url: APP_ROUTES.programs
          }
        ]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Retail", url: APP_ROUTES.storePrograms }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    ) &&
    isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Chain", url: APP_ROUTES.chainPrograms }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Sales Rep", url: APP_ROUTES.programsSpiff }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    ) && ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS
      ? [{ name: "Sales Manager", url: APP_ROUTES.programsSalesManager }]
      : [])
  ]
};

const salesRepManagerProgramsMenu = {
  name: "Programs",
  icon: <ProgramsIcon />,
  children: [
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Retail", url: APP_ROUTES.storePrograms }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    ) &&
    isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Chain", url: APP_ROUTES.chainPrograms }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Sales Rep", url: APP_ROUTES.programsSpiff }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    ) && ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS
      ? [{ name: "Sales Manager", url: APP_ROUTES.programsSalesManager }]
      : [])
  ]
};

const salesRepManagerMinimalProgramsMenu = {
  name: "Programs",
  icon: <ProgramsIcon />,
  children: [
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
    )
      ? [{ name: "Sales Rep", url: APP_ROUTES.programsSpiff }]
      : []),
    ...(isDistributorFeatureEnabled(
      getUserClient()?.parentEntityId ??
        getUserClient()?.associatedUserId ??
        null,
      SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    ) && ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS
      ? [{ name: "Sales Manager", url: APP_ROUTES.programsSalesManager }]
      : [])
  ]
};

export const SIDE_BAR_MENUS = {
  [USER_ROLES.STORE]: [
    {
      name: "Dashboard",
      url: APP_ROUTES.storeDashboard,
      icon: <DashboardIcon />
    },
    {
      name: "Wishlist",
      url: APP_ROUTES.storeWishlist,
      icon: <WishlistIcon />
    },
    // {
    //   name: "Finance",
    //   url: APP_ROUTES.finance,
    //   icon: <FinanceIcon />
    // },
    {
      name: "Account",
      url: APP_ROUTES.account,
      icon: <StoreAccount />
    }
  ],
  [USER_ROLES.DISTRIBUTOR_ADMIN]: [
    dashboardMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? productInsightsMenu
        : null;
    })(),
    distributorProgramsMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? storesMenu
        : salesRepStoresMenu;
    })()
  ].filter(Boolean) as Menu[],
  [USER_ROLES.DISTRIBUTOR_EXECUTIVE]: [
    dashboardMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? productInsightsMenu
        : null;
    })(),
    distributorProgramsMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? storesMenu
        : salesRepStoresMenu;
    })()
  ].filter(Boolean) as Menu[],
  [USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER]: [
    dashboardMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? productInsightsMenu
        : null;
    })(),
    distributorProgramsMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? storesMenu
        : salesRepStoresMenu;
    })()
  ].filter(Boolean) as Menu[],
  [USER_ROLES.DISTRIBUTOR_SALES_MANAGER]: [
    dashboardMenu,
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? productInsightsMenu
        : null;
    })(),
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        isDistributorSalesRepManager(user?.role ?? "")
          ? user?.associatedUserId
          : distributorId,
        MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS
      )
        ? salesRepManagerMinimalProgramsMenu
        : salesRepManagerProgramsMenu;
    })(),
    (() => {
      const user = getUserClient();
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      return isDistributorFeatureEnabled(
        distributorId,
        CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
      )
        ? storesMenu
        : salesRepStoresMenu;
    })()
  ].filter(Boolean) as Menu[],
  [USER_ROLES.DISTRIBUTOR_SALES_REP]: [
    dashboardMenu,
    storeProgramsMenu,
    salesRepStoresMenu
  ].filter(Boolean) as Menu[],
  [USER_ROLES.MANUFACTURER]: [dashboardMenu, programsMenu, salesRepStoresMenu],
  [USER_ROLES.MANUFACTURER_EXECUTIVE]: [
    dashboardMenu,
    programsMenu,
    salesRepStoresMenu
  ],
  [USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER]: [
    dashboardMenu,
    programsMenu,
    salesRepStoresMenu
  ],
  [USER_ROLES.CHAIN_ADMIN]: [
    dashboardMenu,
    {
      name: "Admin",
      url: APP_ROUTES.store,
      icon: <StoresIcon />
    },
    accountMenu
  ],
  [USER_ROLES.SUPER_ADMIN]: [dashboardMenu, internalToolsMenu]
};
