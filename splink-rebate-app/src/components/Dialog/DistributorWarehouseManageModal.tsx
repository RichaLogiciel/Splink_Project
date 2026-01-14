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

interface DistributorWarehouseManageModalType {
  isOpen: boolean;
  user: any;
  onClose: () => void;
}

interface WarehouseType {
  name: string;
  id: number;
}

const DistributorWarehouseManageModal = ({
  isOpen,
  user,
  onClose
}: DistributorWarehouseManageModalType) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [idsInProcess, setIdsInProcess] = useState<number[] | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [assignedWarehouseIds, setAssignedWarehouseIds] = useState<number[]>(
    []
  );
  const [unassignedWarehouseIds, setUnassignedWarehouseIds] = useState<
    number[]
  >([]);

  const assignedWarehouses = useMemo(() => {
    return warehouses.filter((warehouse: WarehouseType) =>
      assignedWarehouseIds.includes(warehouse.id)
    );
  }, [warehouses, assignedWarehouseIds]);

  const unassignedWarehouses = useMemo(() => {
    return warehouses.filter((warehouse: WarehouseType) =>
      unassignedWarehouseIds.includes(warehouse.id)
    );
  }, [warehouses, unassignedWarehouseIds]);
  console.log("1");

  useEffect(() => {
    const fetchSalesVolume = async () => {
      setIsLoading(true);
      try {
        const url = `/distributor/get-manager-warehouses?managerId=${user.UserRole.associatedUserId}`;

        const { data }: any = await apiClient.get(url);
        setWarehouses([
          ...(data?.warehouses?.assigned || []),
          ...(data?.warehouses?.unassigned || [])
        ]);
        setAssignedWarehouseIds(
          (data?.warehouses?.assigned || []).map((di: any) => di.id)
        );
        setUnassignedWarehouseIds(
          (data?.warehouses?.unassigned || []).map((di: any) => di.id)
        );
      } catch (error) {
        console.error("Error fetching manager warehouses:", error);
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

  const handleAssignment = async (warehouseId: number) => {
    try {
      setIdsInProcess((prev) => [...(prev ?? []), warehouseId]);
      const url = `/distributor/managers/${user.UserRole.associatedUserId}/assign-warehouse/${warehouseId}`;
      const { data }: any = await apiClient.post(url);

      if (data?.status == "assigned") {
        const warehouseId = data.id;
        setAssignedWarehouseIds((prev) => [...prev, warehouseId]);
        setUnassignedWarehouseIds((prev) =>
          prev.filter((id) => id !== warehouseId)
        );
      } else if (data?.status == "unassigned") {
        const warehouseId = data.id;
        setUnassignedWarehouseIds((prev) => [...prev, warehouseId]);
        setAssignedWarehouseIds((prev) =>
          prev.filter((id) => id !== warehouseId)
        );
      }
    } catch (error) {
      console.error("Error updating manager warehouse:", error);
    } finally {
      setIdsInProcess(
        (prev) => prev?.filter((id: number) => id != warehouseId) ?? null
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
                <span>Manage Warehouses</span>
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
                          {renderWarehouseList(
                            assignedWarehouses,
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
                          {renderWarehouseList(
                            unassignedWarehouses,
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

export default DistributorWarehouseManageModal;

const renderWarehouseList = (
  list: WarehouseType[],
  isAssigned: boolean,
  idsInProcess: any[] | null,
  handleAssignment: (warehouseId: number) => void
) => {
  if (!list.length) {
    return (
      <li className="py-3.5 text-heading-very-light text-sm text-center">
        {MESSAGES.NO_RECORDS_FOUND}
      </li>
    );
  }

  return list.map((warehouse, index) => {
    const isProcessing = idsInProcess?.includes(warehouse.id);
    return (
      <li
        key={`${warehouse.name}-${index}`}
        className="py-3.5 last:border-0 last:pb-0 border-b border-border-gray flex justify-between gap-4 items-center"
      >
        <div className="flex gap-4 right min-w-32 justify-between">
          {warehouse.name}
        </div>
        <button
          className="bg-green h-full rounded py-1 px-2 flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90 disabled:text-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
          disabled={isProcessing}
          onClick={() => handleAssignment(warehouse.id)}
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
