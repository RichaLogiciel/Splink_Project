"use client";
// Import Core functionality/component
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Util functions
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { getAggregateSalesVolume } from "@/views/Distributor/programDetailClientAPIs";
import { useEffect, useState } from "react";

interface StoreProgramData {
  id: number;
  programDetailId: number;
  rebate: string;
  type: string;
  overview: string;
  description?: string;
  paymentTerms: string;
  rebateType: string;
  graph: any | null;
  storeCompliance: {
    total: number;
    completed: number;
  };
  totalSaving: {
    amount: number;
    yoy: number;
  };
}

export interface DistributorProgramDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  programData: StoreProgramData;
}

const DistributorProgramDetailsModal: React.FC<
  DistributorProgramDetailsModalProps
> = ({ isOpen, setIsOpen, programData }) => {
  const [salesVolume, setSalesVolume] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchSalesVolume = async () => {
      setIsLoading(true);
      try {
        const salesVolumeRes = await getAggregateSalesVolume(
          programData.id,
          programData.programDetailId
        );
        setSalesVolume(salesVolumeRes);
      } catch (error) {
        console.error("Error fetching sales volume:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSalesVolume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="max-w-3xl w-full border bg-white p-6 rounded-lg">
              <DialogTitle className="flex justify-between">
                <p className="font-semibold text-lg">
                  {`${programData?.type}`}
                </p>
                <Image
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  alt="popupCloseIcon"
                  height={13}
                  width={13}
                />
              </DialogTitle>

              {(programData?.description || programData?.overview) && (
                <div className="mt-4 border rounded-lg p-4 text-sm">
                  <p className="text-filter-light mb-1">Description</p>
                  <pre
                    className="text-medium text-highlighted-color overflow-y-auto pr-2 -mr-2 max-h-28 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: programData?.description || programData?.overview
                    }}
                  ></pre>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  id="store-compliance-card"
                  className="border rounded-lg p-3"
                >
                  <div className="flex gap-1.5 items-center">
                    <span className="text-sm font-medium text-highlighted-color">
                      Store Compliance
                    </span>
                  </div>

                  <p className="font-bold text-lg mt-3">
                    {programData?.storeCompliance?.completed || 0}/
                    <span className="text-filter-light text-sm font-medium">
                      {programData?.storeCompliance?.total || 0}
                    </span>
                  </p>
                </div>

                <div id="sales-volume-card" className="border rounded-lg p-3">
                  <div className="flex gap-1.5 items-center">
                    <Image
                      height={19}
                      width={19}
                      src={GreenDollarIcon.src}
                      alt="Sales Volume Icon"
                    />
                    <span className="text-sm font-medium text-heading-light">
                      Sales Volume
                    </span>
                  </div>

                  <p className="font-bold text-lg mt-3">
                    {isLoading ? (
                      <span className="block w-24 h-6 bg-gray-200 animate-pulse"></span>
                    ) : (
                      `$${formatNumber(salesVolume)}`
                    )}
                  </p>
                </div>

                <div
                  id="estimated-store-earnings-card"
                  className="border rounded-lg p-3"
                >
                  <div className="flex gap-1.5 items-center">
                    <Image
                      height={19}
                      width={19}
                      src={GreenDollarIcon.src}
                      alt="Estimated Earnings Icon"
                    />
                    <span className="text-sm font-medium text-heading-light">
                      Estimated Earnings
                    </span>
                  </div>

                  <p className="font-bold text-lg mt-3">
                    ${formatNumber(programData?.totalSaving?.amount) || "0"}
                  </p>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};
export default DistributorProgramDetailsModal;
