"use client";

// Import Core functionality/component
import { useRouter } from "next/navigation";
import React, { useState } from "react";

// Import Components
import Avatar from "../Avatar/RepAvatar";
import HorizontalProgressBar from "../Progress/HorizontalProgressBar";
import Pagination from "./Pagination";

// Import Util functions
import { calcPercentage } from "../../utils/calculations";
import { formatNumber } from "../../utils/numberFormatter";

// Import Types
import { EnrolledProgram } from "@/types/StoreTypes";
import { StoreComplianceData } from "../../types/ProgramStoresTypes"; // Adjust import path as needed
import StoreDetailsModal from "../Dialog/StoreDetailsModal";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";

interface ProgramStoreTableProps {
  stores: StoreComplianceData[]; // Use the new interface
  currentPage: number;
  totalPages: number;
  totalStores: number;
  pageVariable?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  isStoreEnrolled: boolean;
  isSalesRep?: boolean;
}

const ProgramStoreTable: React.FC<ProgramStoreTableProps> = ({
  stores,
  currentPage,
  totalPages,
  totalStores,
  pageVariable = PAGINATION_PAGE_QUERY_PARAMS.PAGE,
  manufacturerId,
  manufacturerName,
  isStoreEnrolled,
  isSalesRep
}) => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedStore, setSelectedStore] =
    useState<StoreComplianceData | null>(null);

  const resStartNum =
    currentPage === 1 ? currentPage : 10 * (currentPage - 1) + 1;
  const resEndNum =
    currentPage * 10 > totalStores ? totalStores : currentPage * 10;

  const openStoreModal = (store: StoreComplianceData) => {
    setSelectedStore(store);
    setIsModalOpen(true);
  };

  return (
    <>
      {selectedStore && (
        <StoreDetailsModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          data={
            {
              manufacturer: {
                id: manufacturerId,
                name: manufacturerName
              },
              purchaseVolume: {
                amount: selectedStore.purchaseVolume
              }
            } as EnrolledProgram
          }
          storeId={selectedStore.storeId.toString()}
          isStoreEnrolled={isStoreEnrolled}
        />
      )}
      <div className="storeTable text-left text-sm text-filter-light font-medium font-inter">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="font-semibold px-2 sm:px-4 cursor-pointer w-64">
                  <span className="inline mr-2">Store</span>
                  {/* <Image
                  className="storeSortIcon inline"
                  src={sortIcon.src}
                  alt="sort icon"
                  width={7}
                  height={10}
                /> */}
                </th>
                <th className="font-semibold px-2 sm:px-4 w-32">Chain</th>
                <th className="font-semibold px-2 sm:px-4 w-32">
                  Purchase Volume
                </th>
                <th className="font-semibold px-2 sm:px-4 w-32">
                  Estimated Earnings
                </th>
                <th className="font-semibold px-2 sm:px-4 w-52">
                  Program Compliance
                </th>
                {!isSalesRep && (
                  <th className="font-semibold px-2 sm:px-4 w-52">Sales Rep</th>
                )}
              </tr>
            </thead>
            <tbody>
              {stores.length > 0 ? (
                stores.map((store) => (
                  <tr
                    key={store.storeId}
                    onClick={() => openStoreModal(store)}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-2 sm:px-4 py-3">
                      <div className="min-h-10 flex flex-col justify-center">
                        <p className="font-medium">{store.storeName}</p>
                        <span className="block text-xs text-heading-very-light">
                          {store.storeCity}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3">{""}</td>
                    <td className="px-2 sm:px-4 py-3">
                      ${formatNumber(store.purchaseVolume)}
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      ${formatNumber(store.totalSavings)}
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div className="min-w-32">
                          <HorizontalProgressBar
                            percentage={
                              calcPercentage(
                                store.complianceQualified,
                                store.compliances
                              ) || 0
                            }
                          />
                        </div>
                        <span>
                          <strong>{store.complianceQualified}</strong>/
                          {store.compliances}
                        </span>
                      </div>
                    </td>
                    {!isSalesRep && (
                      <td className="px-2 sm:px-4 py-3">
                        {store.salesRepName && (
                          <Avatar
                            user={{
                              avatar: "", // Assuming you have an avatar URL
                              name: store.salesRepName,
                              bgColor: "" // Optional, include if you have this data
                            }}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr className="border-b">
                  <td className="px-2 sm:px-4 py-3" colSpan={6}>
                    <p className="text-center">
                      There are no stores currently signed up for this program.
                      If you believe this is incorrect, please contact us
                      at&nbsp;
                      <a href="mailto:help@splinktechnlogies.com">
                        help@splinktechnlogies.com
                      </a>
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {stores.length > 0 && (
          <div className="table-footer mt-10 mb-3">
            <div className="flex gap-4 justify-between items-center flex-col sm:flex-row">
              <span className="font-light">
                Showing
                <strong className="font-medium">
                  {` ${resStartNum} - ${resEndNum}`} of {totalStores}
                </strong>
              </span>
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={(page) => {
                  router.push(`${location.pathname}?${pageVariable}=${page}`);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProgramStoreTable;
