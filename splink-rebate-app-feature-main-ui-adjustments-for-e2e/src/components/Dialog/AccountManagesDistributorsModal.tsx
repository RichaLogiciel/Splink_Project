"use client";

// Core|Package imports
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import Card from "@/components/Card";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import { MESSAGES } from "@/configs/messages";
import { apiClient } from "@/lib/axiosClient";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Loader from "../Loader";

interface AccountManagesDistributorsModalType {
  isOpen: boolean;
  user: any;
  onClose: () => void;
}

interface DistributorType {
  name: string;
  userId: number;
  associatedUserId: number;
}

const AccountManagesDistributorsModal = ({
  isOpen,
  user,
  onClose
}: AccountManagesDistributorsModalType) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [idsInProcess, setIdsInProcess] = useState<number[] | null>(null);
  const [distributors, setDistributors] = useState<DistributorType[]>([]);
  const [assignedDistributorIds, setAssignedDistributorIds] = useState<
    number[]
  >([]);
  const [unassignedDistributorIds, setUnassignedDistributorIds] = useState<
    number[]
  >([]);

  const assignedDistributors = useMemo(() => {
    return distributors.filter((distributor: DistributorType) =>
      assignedDistributorIds.includes(distributor.associatedUserId)
    );
  }, [distributors, assignedDistributorIds]);

  const unassignedDistributors = useMemo(() => {
    return distributors.filter((distributor: DistributorType) =>
      unassignedDistributorIds.includes(distributor.associatedUserId)
    );
  }, [distributors, unassignedDistributorIds]);

  useEffect(() => {
    const fetchSalesVolume = async () => {
      setIsLoading(true);
      try {
        const url = `/manufacturer/get-manager-distributors?managerId=${user.UserRole.associatedUserId}`;

        const { data }: any = await apiClient.get(url);
        setDistributors([
          ...(data?.distributors?.assigned || []),
          ...(data?.distributors?.unassigned || [])
        ]);
        setAssignedDistributorIds(
          (data?.distributors?.assigned || []).map(
            (di: any) => di.associatedUserId
          )
        );
        setUnassignedDistributorIds(
          (data?.distributors?.unassigned || []).map(
            (di: any) => di.associatedUserId
          )
        );
      } catch (error) {
        console.error("Error fetching manager distributors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSalesVolume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closePopup = () => {
    onClose();
  };

  const handleAssignment = async (distributorId: number) => {
    try {
      setIdsInProcess((prev) => [...(prev ?? []), distributorId]);
      const url = `/manufacturer/managers/${user.UserRole.associatedUserId}/assign-distributor/${distributorId}`;

      const { data }: any = await apiClient.post(url);

      if (data?.status == "assigned") {
        const distributorId = data.id;
        setAssignedDistributorIds((prev) => [...prev, distributorId]);
        setUnassignedDistributorIds((prev) =>
          prev.filter((id) => id !== distributorId)
        );
      } else if (data?.status == "unassigned") {
        const distributorId = data.id;
        setUnassignedDistributorIds((prev) => [...prev, distributorId]);
        setAssignedDistributorIds((prev) =>
          prev.filter((id) => id !== distributorId)
        );
      }
    } catch (error) {
      console.error("Error updating manager distributor:", error);
    } finally {
      setIdsInProcess(
        (prev) => prev?.filter((id: number) => id != distributorId) ?? null
      );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={closePopup} className="relative z-50">
        {/* Popup Content */}
        <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black/20 p-4">
          <div className="relative flex min-h-full items-center justify-center">
            <Loader
              show={isLoading}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
            />
            <DialogPanel className="w-full max-w-lg rounded bg-white px-4 sm:px-6 py-5 shadow-lg sm:min-w-[670px]">
              <DialogTitle className="mb-5 font-semibold text-lg text-highlighted-color flex justify-between items-center">
                <span>Manage Distributors</span>
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
                <Tabs
                  tabSearchParamKey=""
                  autoAdjustHeight={false}
                  className="px-[0px] py-[0px] font-medium text-heading-light"
                  labelClass=""
                  disableRouterPush
                >
                  <Tab label="Assigned">
                    <Card className="w-full" padding="none">
                      <div className="text-xs">
                        <ul
                          className={`text-sm max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[23vh] overflow-y-auto pr-2 -mr-2`}
                        >
                          {renderDistributorList(
                            assignedDistributors,
                            true,
                            idsInProcess,
                            handleAssignment
                          )}
                        </ul>
                      </div>
                    </Card>
                  </Tab>
                  <Tab label="Unassigned">
                    <Card className="w-full" padding="none">
                      <div className="text-xs">
                        <ul
                          className={`text-sm max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[23vh] overflow-y-auto pr-2 -mr-2`}
                        >
                          {renderDistributorList(
                            unassignedDistributors,
                            false,
                            idsInProcess,
                            handleAssignment
                          )}
                        </ul>
                      </div>
                    </Card>
                  </Tab>
                </Tabs>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default AccountManagesDistributorsModal;

const renderDistributorList = (
  list: DistributorType[],
  isAssigned: boolean,
  idsInProcess: any[] | null,
  handleAssignment: (distributorId: number) => void
) => {
  if (!list.length) {
    return (
      <li className="py-3.5 text-heading-very-light text-sm text-center">
        {MESSAGES.NO_RECORDS_FOUND}
      </li>
    );
  }

  return list.map((distributor, index) => {
    const isProcessing = idsInProcess?.includes(distributor.associatedUserId);
    return (
      <li
        key={`${distributor.name}-${index}`}
        className="py-3.5 last:border-0 last:pb-0 border-b border-border-gray flex justify-between gap-4 items-center"
      >
        <div className="flex gap-4 right min-w-32 justify-between">
          {distributor.name}
        </div>
        <button
          className="bg-green h-full rounded py-1 px-2 flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90 disabled:text-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
          disabled={isProcessing}
          onClick={() => handleAssignment(distributor.associatedUserId)}
        >
          {isProcessing ? (
            <>
              <div className="loader border-2 border-gray-300 border-t-2 border-t-profit rounded-full w-5 h-5 animate-spin"></div>
              Processing...
            </>
          ) : isAssigned ? (
            "Unassign"
          ) : (
            "Assign"
          )}
        </button>
      </li>
    );
  });
};
