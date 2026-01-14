"use client";

// Core|Package imports
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import Card from "@/components/Card";
import { MESSAGES } from "@/configs/messages";
import { apiClient } from "@/lib/axiosClient";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface AssignStoreSalesRepModalType {
  isOpen: boolean;
  store: any;
  salesReps: any[];
  onClose: () => void;
  onUpdate: (salesRepId: number, salesRepName: string) => void;
}

const AssignStoreSalesRepModal = ({
  isOpen,
  store,
  onClose,
  onUpdate,
  salesReps
}: AssignStoreSalesRepModalType) => {
  const [isLoaddingId, setIsLoadingId] = useState<number | null>(null);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<number | null>(
    store?.storeInfo?.rep?.associatedUserId ?? null
  );

  useEffect(() => {
    if (isOpen && store) {
      setSelectedSalesRepId(store?.storeInfo?.rep?.associatedUserId);
    }
  }, [isOpen]);

  const closePopup = () => {
    onClose();
  };

  const handleAssignmenet = async (salesRepId: number) => {
    try {
      setIsLoadingId(salesRepId);
      const url = `/distributor/stores/${store.id}/assign-sales-rep/${salesRepId}`;

      const { data }: any = await apiClient.post(url);

      if (data?.status == "assigned") {
        setSelectedSalesRepId(data.id);
        const name = salesReps?.find(
          (sr: any) => sr.associatedUserId == data.id
        )?.name;
        onUpdate(data.id, name);
      }

      toast.success("Sales rep has been successfully updated for this store");
    } catch (error) {
      console.error("Error updating store sales rep relation:", error);
      toast.error("Failed to update the sales rep. Please try again.");
    } finally {
      setIsLoadingId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={closePopup} className="relative z-50">
        {/* Popup Content */}
        <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black/20 p-4">
          <div className="relative flex min-h-full items-center justify-center">
            <DialogPanel className="w-full max-w-lg rounded bg-white px-4 sm:px-6 py-5 shadow-lg sm:min-w-[670px]">
              <DialogTitle className="mb-5 font-semibold text-lg text-highlighted-color flex justify-between items-center">
                <span>Assign Sales Rep</span>
                <Image
                  onClick={closePopup}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  width={13}
                  height={13}
                  alt="Close Button"
                />
              </DialogTitle>
              <div className="mt-4 sm:mt-7">
                <Card className="w-full" padding="none">
                  <div className="text-xs">
                    <ul
                      className={`text-sm max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[23vh] overflow-y-auto pr-2 -mr-2`}
                    >
                      {salesReps?.length ? (
                        salesReps
                          .filter(
                            (sl: any) =>
                              sl.associatedUserId != selectedSalesRepId
                          )
                          .map(
                            (
                              salesRep: {
                                id: number;
                                name: string;
                                associatedUserId: number;
                              },
                              index: number
                            ) => (
                              <li
                                key={`${salesRep.name}-${index}`}
                                className="py-3.5 last:border-0 last:pb-0 border-b border-border-gray flex justify-between gap-4 items-center"
                              >
                                <div
                                  className={`flex gap-4 right min-w-32 justify-between`}
                                >
                                  {salesRep.name}
                                </div>
                                <button
                                  className={`
                                    bg-green 
                                    h-full rounded py-1 px-2 
                                    flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm 
                                    font-medium hover:bg-opacity-90 disabled:bg-gray-400 
                                    disabled:text-gray-200 
                                    disabled:cursor-not-allowed 
                                    disabled:hover:bg-gray-400`}
                                  onClick={() => {
                                    handleAssignmenet(
                                      salesRep.associatedUserId
                                    );
                                  }}
                                  disabled={isLoaddingId ? true : false}
                                >
                                  {isLoaddingId == salesRep.associatedUserId ? (
                                    <div className="loader border-2 border-gray-300 border-t-2 border-t-profit rounded-full w-5 h-5 animate-spin"></div>
                                  ) : (
                                    <></>
                                  )}
                                  {isLoaddingId == salesRep.associatedUserId
                                    ? "..."
                                    : "assign"}
                                </button>
                              </li>
                            )
                          )
                      ) : (
                        <li className="py-3.5 text-heading-very-light text-sm text-center">
                          {MESSAGES.NO_RECORDS_FOUND}
                        </li>
                      )}
                    </ul>
                  </div>
                </Card>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default AssignStoreSalesRepModal;
