// Import Core functionality/component
import DynamicSemiPieChart from "@/components/SemiPieChartCustom/DynamicSemiPieChart";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Util functions
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { calcPercentage } from "@/utils/calculations";
import { PROGRESS_COLORS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorSalesRepManager } from "@/utils/rolesConditions";
import { hariboProgressData } from "@/views/Distributor/salesManagerData";
import Card from "../Card";

interface SalesManagerProgramDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  programData?: any;
}

const SalesManagerProgramDetailsModal: React.FC<
  SalesManagerProgramDetailsModalProps
> = ({ isOpen, setIsOpen, programData }) => {
  const user = getUserClient();
  const isSalesManager = isDistributorSalesRepManager(user?.role ?? "");

  // Static data for the modal - no API calls
  const staticProgramData = {
    type: "Haribo Void Closures",
    overview: "Close 75% of total voids across your sales reps",
    description: "Earn $250 by closing 75% of voids across your sales reps",
    rebate: "250",
    earnedRebate: "250",
    programType: "VOID_FILL",
    complianceStatus: true,
    progressTrack: hariboProgressData.progressTrack,
    earningsOpportunity: hariboProgressData.earningsOpportunity,
    graph: {
      "Total Voids": {
        completed: 190,
        total: 250,
        chartColor: "#18B368"
      }
    }
  };

  const EarningsDisplay = ({ value }: { value: string }) => {
    const rebateValue = formatNumber(Number(value ?? "0"), false);
    return <p className="font-bold text-lg mt-3">${rebateValue}</p>;
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        <div
          id="sales-manager-program-details-modal"
          className="sales-manager-program-details-modal fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="max-w-2xl w-full border bg-white p-4 sm:p-6 rounded-lg">
              <DialogTitle className="flex justify-between">
                <p className="font-semibold text-lg">
                  {staticProgramData.type}
                </p>
                <div className="flex gap-2 items-center">
                  <Image
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer"
                    src={popupCloseIcon.src}
                    alt="popupCloseIcon"
                    height={13}
                    width={13}
                  />
                </div>
              </DialogTitle>

              {staticProgramData.description && (
                <div className="mt-4 border rounded-lg p-4 text-sm">
                  <p className="text-filter-light mb-1">Description</p>
                  <pre
                    className="text-medium text-highlighted-color overflow-y-auto pr-2 -mr-2 max-h-28 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: staticProgramData.description
                    }}
                  ></pre>
                </div>
              )}

              {/* Progress cards */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="progress-track-card" className="border rounded-lg p-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-sm font-medium text-highlighted-color">
                      Progress Track
                    </span>
                  </div>
                  <div className="mt-3 flex gap-x-2 gap-y-1 flex-wrap overflow-y-auto pr-2 -mr-2 max-h-20">
                    <p className="font-normal text-lg">
                      <span className="font-bold text-lg">
                        {staticProgramData.progressTrack.completed}/
                        {staticProgramData.progressTrack.total}
                      </span>
                      <span className="text-filter-light text-xs ml-1">
                        {staticProgramData.progressTrack.label}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="EstimatedEarnings border rounded-lg p-3">
                  <div className="flex gap-1.5 items-center">
                    <Image
                      height={19}
                      width={19}
                      src={GreenDollarIcon.src}
                      alt="Estimated Earnings Icon"
                    />
                    <span className="text-sm font-medium text-heading-light">
                      {isSalesManager
                        ? "My Earnings"
                        : "Total Manager Earnings"}
                    </span>
                  </div>
                  <EarningsDisplay value={staticProgramData.earnedRebate} />
                </div>
              </div>

              {/* Progress visualization */}
              <div className="border border-slate-200 mt-4 rounded-md">
                <div className="w-full flex-1 p-0">
                  <Card className="progress-visualization relative h-full">
                    {Object.keys(staticProgramData.graph).map((label) => {
                      const graphData =
                        staticProgramData.graph[
                          label as keyof typeof staticProgramData.graph
                        ];
                      const completed = Math.round(Number(graphData.completed));
                      const total = Math.round(Number(graphData.total));

                      const semiPieChartColor =
                        staticProgramData.complianceStatus
                          ? PROGRESS_COLORS.COMPLETED
                          : PROGRESS_COLORS.PENDING;

                      return (
                        <div
                          key={`progress-${label}`}
                          className="chart mt-3 cursor-pointer p-4"
                        >
                          {total == 0 ? (
                            <p className="font-bold text-lg mt-3">
                              {formatNumber(completed, true)}
                              <span className="text-filter-light text-xs font-normal ml-1 capitalize">
                                {label}
                              </span>
                            </p>
                          ) : (
                            <DynamicSemiPieChart
                              percentage={calcPercentage(completed, total)}
                              title={`${formatNumber(completed)}/${formatNumber(total)}`}
                              desc={label}
                              pieColor={semiPieChartColor}
                              cx={100}
                              height={90}
                              width={210}
                              textX={105}
                            />
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default SalesManagerProgramDetailsModal;
