"use client";

import StoreProgramDetailTabs from "@/components/skeletons/StoreProgramDetailTabs";
import StoreProgramDetailTopInsights from "@/components/skeletons/StoreProgramDetailTopInsights";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import StoreProgramDetailHeader from "./StoreProgramDetailHeader";

interface StoreProgramDetailLoadingProps {
  showWarehouseFilter?: boolean;
  warehouses?: any[];
  isSalesRepManager?: boolean;
}

const StoreProgramDetailLoading: React.FC<StoreProgramDetailLoadingProps> = ({
  showWarehouseFilter = false,
  warehouses = [],
  isSalesRepManager = false
}) => {
  return (
    <div id="store-program-detail" data-testid="store-program-detail">
      <StoreProgramDetailHeader
        manufacturer={{
          name: "Store Program Details",
          avatar: ""
        }}
        backUrl="#"
        warehouseFilter={
          showWarehouseFilter && !isSalesRepManager ? (
            <WarehouseSelectFilter
              isManager={warehouses ? true : false}
              warehouses={warehouses ?? []}
            />
          ) : undefined
        }
      />
      <StoreProgramDetailTopInsights elementCount={4} />
      <StoreProgramDetailTabs />
    </div>
  );
};

export default StoreProgramDetailLoading;
