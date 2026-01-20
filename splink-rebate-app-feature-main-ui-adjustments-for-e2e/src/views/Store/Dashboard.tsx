// Import Core Components
import React from "react";

// Import Components
import StoreDashboardCards from "@/components/Card/StoreDashboardCards";
import StoreProgramCards from "@/components/Card/StoreProgramCards";

// Import Types
import { getKeyMetrics, getPrograms } from "@/app/app/DashboardAPIs";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import ProgramExpirationNotice from "@/components/ProgramExpirationNotice/ProgramExpirationNotice";
import { ProgramListingCard } from "@/types/ProgramTypes";
import { StoreDashboardPageProps } from "@/types/StoreDashboard";
import { ENABLE_PROGRAM_EXPIRATION_NOTICE } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { getProgramTimelineQueryParam } from "@/utils/helper";

const StoreDashboard: React.FC<StoreDashboardPageProps> = async ({
  programTimeline
}) => {
  const user = getUserServer();
  const userId = user?.id;

  const data = await getKeyMetrics(userId);
  const storeData = await getPrograms(
    userId,
    "STORE",
    undefined,
    getProgramTimelineQueryParam(programTimeline)
  );

  return (
    <>
      {ENABLE_PROGRAM_EXPIRATION_NOTICE && (
        <ProgramExpirationNotice messageType="WARNING" isStoreUser={true} />
      )}
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Dashboard</h2>
      <StoreDashboardCards data={data} />

      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold">Program List</h2>
        <ProgramTimelineOptionSelector />
      </div>
      <StoreProgramCards
        data={storeData as ProgramListingCard[]}
        userId={userId}
      />
    </>
  );
};

export default StoreDashboard;
