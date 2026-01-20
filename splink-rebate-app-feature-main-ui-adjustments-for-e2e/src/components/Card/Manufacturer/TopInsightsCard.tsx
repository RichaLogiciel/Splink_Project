import React from "react";

// import cards
import TotalDistributorsCard from "./TotalDistributorsCard";
import TotalStoresCard from "./TotalStoresCard";
import TotalActiveStoreProgramsCard from "./TotalActiveStoreProgramsCard";

interface ManufacturerTopInsightsData {
  totalSales: {
    result: {
      [month: number]: {
        totalSale: number;
      };
    };
  };
  totalDistributors: number;
  totalStores: {
    storesCount: number;
    activeStores: number;
  };
  storesEnrolledInProgramsCount: number;
}
interface TopInsightsCardProps {
  keyMetricsResponse: ManufacturerTopInsightsData;
  userName: string;
}

const TopInsightsCard: React.FC<TopInsightsCardProps> = ({
  keyMetricsResponse
}) => {
  return (
    <>
      {/* <TotalSalesCard totalSales={keyMetricsResponse?.totalSales.result} /> */}
      <TotalDistributorsCard
        distributorsCount={keyMetricsResponse?.totalDistributors}
      />
      <TotalStoresCard
        activeStoresCount={keyMetricsResponse?.totalStores.activeStores}
      />
      <TotalActiveStoreProgramsCard
        storesEnrolledInProgramsCount={
          keyMetricsResponse?.storesEnrolledInProgramsCount
        }
      />
    </>
  );
};

export default TopInsightsCard;
