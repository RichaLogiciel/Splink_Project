import { getUserServer } from "@/utils/getUserServer";
import ProductInsightsDashboardWrapper from "@/views/Distributor/productInsightsDashboardWrapper";

import MixpanelTracker from "@/components/MixpanelTracker";
import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";
import { ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";
import { isDistributorFeatureEnabled } from "@/utils/helper";

interface ProductsInsightsPageProps {
  searchParams: {
    manufacturerId: string;
    warehouseId: string;
  };
}

const ProductsInsightsPage = async ({
  searchParams
}: ProductsInsightsPageProps) => {
  const user = getUserServer();

  return (
    <>
      <MixpanelTracker
        eventName="Product Insights View"
        properties={{
          userRole: user?.role,
          timestamp: new Date().toISOString()
        }}
      />

      {(() => {
        switch (user?.role) {
          case USER_ROLES.DISTRIBUTOR_ADMIN:
          case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
          case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER: {
            const distributorId =
              user?.parentEntityId ?? user?.associatedUserId ?? null;
            if (
              isDistributorFeatureEnabled(
                distributorId,
                ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS
              )
            ) {
              return (
                <ProductInsightsDashboardWrapper searchParams={searchParams} />
              );
            }
            return (
              <>
                <b className="block pb-4">
                  Role: {user?.role} - Product Insights
                </b>
                <NoAccess />
              </>
            );
          }

          default:
            return (
              <>
                <b className="block pb-4">
                  Role: {user?.role} - Product Insights
                </b>
                <NoAccess />
              </>
            );
        }
      })()}
    </>
  );
};
export default ProductsInsightsPage;
