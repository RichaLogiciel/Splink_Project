// Import Components
import ProgramCard from "@/components/Card/ProgramCard";
import { apiServerClient } from "@/lib/axiosServer";

// Import Types
import { ProgramListingCard } from "@/types/ProgramTypes";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { ENTITY_TYPES_RESPONSE } from "@/views/Distributor/programConstants";
import { mapResponseToProgramListingCard } from "@/views/Distributor/programsApiDataHelpers";

export const dynamic = "force-dynamic";

const fetchChainData = async (
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean
) => {
  try {
    const programTimelineQueryParam =
      getProgramTimelineQueryParam(programTimeline);
    const url = `/programs?type=${ENTITY_TYPES_RESPONSE.CHAIN}&warehouseId=${warehouseId}&programTimeline=${programTimelineQueryParam}&isInternal=${isInternal}`;

    const { data } = await apiServerClient.get(url);
    const mappedData = mapResponseToProgramListingCard(
      data,
      ENTITY_TYPES_RESPONSE.STORE
    );
    return mappedData;
  } catch (error) {
    return [];
  }
};

const ChainProgramsTab = async ({
  warehouseId,
  programTimeline,
  isInternal = false
}: {
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
}) => {
  const programs = await fetchChainData(
    warehouseId,
    programTimeline,
    isInternal
  );

  return programs.length > 0 ? (
    <div className="flex flex-wrap gap-4 mt-2">
      {programs.map((chain: ProgramListingCard) => (
        <ProgramCard
          purchaseLabel="Sales Volume"
          savingLabel="Est. Chain Earnings"
          key={chain.id}
          url="/app/programs/chain/"
          data={chain}
          showProgramPaymentTermBadge
          programTimeline={getProgramTimelineQueryParam(programTimeline)}
          isInternal={isInternal}
          warehouseId={warehouseId}
        />
      ))}
    </div>
  ) : (
    <p className="text-center">
      It seems there are currently no chain programs available. Please check
      back later or explore other sections.
    </p>
  );
};

export default ChainProgramsTab;
