"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Divider from "@/components/Divider";
import CategorizedTabProductList from "@/components/Elements/CategorizedTabProductList";
import ManufacturerProgramCard from "@/components/Card/ManufacturerProgramCard";
import Row from "@/components/Row";
import { ProgramComplianceDetails } from "@/types/DistributorTypes";
import { MESSAGES } from "@/configs/messages";
import { useROIView } from "@/contexts/ROIViewContext";
import { useSearchParams } from "next/navigation";

interface ProgramOverview {
  programName: string;
  completedCompliances: number;
  totalEnrollments: number;
  rebate: number;
  programStartDate: string;
  programEndDate: string;
  overview?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  rebate_amount?: string;
  _tiers?: (ProgramOverview | ProgramComplianceDetails)[];
}

interface ProgramsClientProps {
  distributorProgramsData: (ProgramOverview | ProgramComplianceDetails)[];
  storeProgramsData: (ProgramOverview | ProgramComplianceDetails)[];
  salesRepsProgramsData: (ProgramOverview | ProgramComplianceDetails)[];
  triggerUIUpdateForManufacturer: boolean;
  categorizedProducts?: any;
}

const ProgramsClient: React.FC<ProgramsClientProps> = ({
  distributorProgramsData,
  storeProgramsData,
  salesRepsProgramsData,
  triggerUIUpdateForManufacturer,
  categorizedProducts
}) => {
  const { showROIView } = useROIView();
  const searchParams = useSearchParams();
  const distributorId = searchParams.get("distributorId");
  const [isROIExpanded, setIsROIExpanded] = useState(false);

  const programCardRender = (
    data: ProgramOverview | ProgramComplianceDetails,
    isDistributorProgram: boolean = true,
    idx: number,
    isSalesRep: boolean = false
  ) => {
    // Don't show ROI for Distributor Programs (but allow for Store Programs and Sales Reps)
    const shouldShowROI = showROIView && (!isDistributorProgram || isSalesRep);

    return (
      <ManufacturerProgramCard
        key={idx}
        data={data}
        isDistributorProgram={isDistributorProgram}
        isSalesRep={isSalesRep}
        showROIView={shouldShowROI}
        distributorId={distributorId ? Number(distributorId) : undefined}
        isROIExpanded={isROIExpanded}
        onROIExpandedChange={setIsROIExpanded}
      />
    );
  };

  return (
    <>
      <Row className="flex-wrap">
        {!triggerUIUpdateForManufacturer ? (
          <Card className="w-full">
            <div className="text-lg font-semibold mb-6">
              Distributor Programs
            </div>

            <Divider />

            <div
              id="distributor-programs"
              className="flex flex-wrap gap-4 w-full"
            >
              {distributorProgramsData?.length > 0 ? (
                distributorProgramsData.map((prod, idx: number) =>
                  programCardRender(prod, true, idx)
                )
              ) : (
                <p className="text-center w-full text-heading-very-light text-sm">
                  {MESSAGES.NO_RECORDS_FOUND}
                </p>
              )}
            </div>
          </Card>
        ) : null}

        <Card className="w-full">
          <div className="text-lg font-semibold mb-3">Store Programs</div>

          <Divider />

          <div id="store-programs" className="flex flex-wrap gap-4 w-full">
            {storeProgramsData?.length > 0 ? (
              storeProgramsData.map((prod, idx: number) =>
                programCardRender(prod, false, idx)
              )
            ) : (
              <p className="text-center w-full text-heading-very-light text-sm">
                {MESSAGES.NO_RECORDS_FOUND}
              </p>
            )}
          </div>
        </Card>

        <Card className="w-full">
          <div className="text-lg font-semibold mb-6">Sales Reps</div>

          <Divider />

          <div id="sales-reps-programs" className="flex flex-wrap gap-4 w-full">
            {salesRepsProgramsData?.length > 0 ? (
              salesRepsProgramsData.map((prod, idx: number) =>
                programCardRender(prod, true, idx, true)
              )
            ) : (
              <p className="text-center w-full text-heading-very-light text-sm">
                {MESSAGES.NO_RECORDS_FOUND}
              </p>
            )}
          </div>
        </Card>

        {/* Show categorized products only if triggerUIUpdateForManufacturer is true */}
        {triggerUIUpdateForManufacturer &&
          categorizedProducts?.categorizedProducts && (
            <Card className="w-full">
              <div className="text-lg font-semibold">Program Products</div>
              <div
                id="program-products"
                className="flex flex-wrap gap-4 w-full"
              >
                <CategorizedTabProductList
                  className="mt-6 border rounded-lg p-4 w-full"
                  categorizedProducts={categorizedProducts?.categorizedProducts}
                  tabSearchParamKey=""
                  displayLabels
                  showDistributorCode={false}
                  emptyListMessage={MESSAGES.NO_RECORDS_FOUND}
                />
              </div>
            </Card>
          )}
      </Row>
    </>
  );
};

export default ProgramsClient;
