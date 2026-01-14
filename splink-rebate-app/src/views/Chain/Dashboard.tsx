// Import Core Components
import React from "react";

// Import Components
import StoreDashboardCards from "@/components/Card/StoreDashboardCards";
import StoreProgramCards from "@/components/Card/StoreProgramCards";

// Import Types
import {
  fetchChainStores,
  getChainKeyMetrics,
  getPrograms
} from "@/app/app/DashboardAPIs";
import { ProgramListingCard } from "@/types/ProgramTypes";
import { getUserServer } from "@/utils/getUserServer";
import SelectFilter from "@/components/SelectFilter";

interface ChainDashboardProps {
  searchParams: {
    storeId: string;
  };
}

const ChainDashboard = async ({ searchParams }: ChainDashboardProps) => {
  const storeId = searchParams?.storeId;
  const user = getUserServer();
  const userId = user?.id;

  const data = await getChainKeyMetrics(storeId);
  const storeData = await getPrograms(userId, "STORE", storeId);
  const stores = await fetchChainStores();

  return (
    <>
      <div className="flex mb-4 sm:mb-6 justify-between align-middle">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <SelectFilter
          queryParam="storeId"
          options={[
            { value: "", label: "All Stores" },
            // eslint-disable-next-line no-unsafe-optional-chaining
            ...stores?.map((sr: any) => ({ value: sr.id, label: sr.name }))
          ]}
          className="text-xs outline-none rounded p-2 border border-border-gray"
        />
      </div>
      <StoreDashboardCards data={data} />

      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Program List</h2>
      <StoreProgramCards
        data={storeData as ProgramListingCard[]}
        userId={userId}
        stores={!storeId && stores?.length ? stores : undefined}
        selectedStoreId={storeId}
        savingLabel="Total Earnings"
      />
    </>
  );
};

export default ChainDashboard;
