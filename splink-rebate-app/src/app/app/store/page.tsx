import MixpanelTracker from "@/components/MixpanelTracker";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";
import {
  isManufacturerAccountManager,
  isManufacturerExecutive
} from "@/utils/rolesConditions";
import StoreChain from "@/views/Chain/store";
import StoreDistributor from "@/views/Distributor/store";
import StoreManufacturer from "@/views/Manufacturer/store";
import StoreSalesRep from "@/views/SalesRep/store";
import { SHOW_ENABLED_DSD_DISTRIBUTOR_IDS } from "@/utils/constants";
import { isDistributorFeatureEnabled } from "@/utils/helper";

const StorePage = async ({ searchParams }: any) => {
  const user = getUserServer();

  // Check if Annual Purchase Volume column should be shown for Sales Rep and Sales Manager roles
  const showAnnualPurchaseVolumeForSalesRoles =
    (user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP ||
      user?.role === USER_ROLES.DISTRIBUTOR_SALES_MANAGER) &&
    isDistributorFeatureEnabled(
      user.parentEntityId,
      SHOW_ENABLED_DSD_DISTRIBUTOR_IDS
    );

  return (
    <>
      <MixpanelTracker
        eventName="Store View"
        properties={{
          userRole: user?.role,
          timestamp: new Date().toISOString()
        }}
      />

      {(() => {
        switch (user?.role) {
          case USER_ROLES.DISTRIBUTOR_ADMIN:
            return (
              <StoreDistributor
                distributorId={user.associatedUserId}
                searchParams={searchParams}
              />
            );

          case USER_ROLES.CHAIN_ADMIN:
            return <StoreChain searchParams={searchParams} />;

          case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
          case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
          case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
            return (
              <StoreDistributor
                distributorId={user.parentEntityId}
                searchParams={searchParams}
                showAnnualPurchaseVolume={showAnnualPurchaseVolumeForSalesRoles}
              />
            );
          case USER_ROLES.MANUFACTURER:
          case USER_ROLES.MANUFACTURER_EXECUTIVE:
          case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER: {
            const manufacturerId =
              isManufacturerExecutive(user.role) ||
              isManufacturerAccountManager(user.role)
                ? user.parentEntityId
                : user.associatedUserId;

            return (
              <StoreManufacturer
                searchParams={searchParams}
                manufacturerId={manufacturerId}
              />
            );
          }

          case USER_ROLES.DISTRIBUTOR_SALES_REP:
            return (
              <StoreSalesRep
                searchParams={searchParams}
                distributorId={user.parentEntityId}
                salesRepUserId={user.id}
                showAnnualPurchaseVolume={showAnnualPurchaseVolumeForSalesRoles}
              />
            );
        }
      })()}
    </>
  );
};
export default StorePage;
