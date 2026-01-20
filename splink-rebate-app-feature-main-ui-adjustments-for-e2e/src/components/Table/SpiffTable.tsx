"use client";

// Import Core functionality/component
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

// Import Components
import { getUserClient } from "@/utils/getUserClient";

import Pagination from "./Pagination";

// Import Util functions
import { generateQueryString, isEmptyString } from "../../utils/helper";

// Import Contants
import {
  DEFAULT_PAGE_SIZE,
  DISTRIBUTOR_SALESREP_UPDATE,
  PAGINATION_PAGE_QUERY_PARAMS,
  SORT_KEYS
} from "@/utils/constants";

// Import Types
import { StoreListingApiResType } from "../../types/StoreTypes";

// Import Images
import { MESSAGES } from "@/configs/messages";
import { useWindowWidth } from "@/utils/clientHelper";
import { formatNumber } from "@/utils/numberFormatter";
import {
  isChain,
  isDistributorAdminAndExecutive
} from "@/utils/rolesConditions";
import sortIcon from "../../assets/icons/sortIcon.svg";
import sortIconDefault from "../../assets/icons/sortIconDefault.svg";
import sortIconDesc from "../../assets/icons/sortIconDesc.svg";

interface SortableHeaderProps {
  label?: string;
  sortKey?: keyof typeof SORT_KEYS;
  customLabel?: string;
  customKey?: string;
  sort: Record<string, string>;
  className?: string;
  handleSortChange: (key: string) => void;
}

const SpiffTable: React.FC<StoreListingApiResType> = ({
  stores: storesData,
  currentPage,
  totalPages,
  totalStores,
  pageVariable = PAGINATION_PAGE_QUERY_PARAMS.PAGE,
  id = "store-table",
  isInternal = false
}) => {
  const router = useRouter();
  const [storeData, setStoreData] = useState(storesData);
  const searchParams = useSearchParams(); // Get the current search parameters
  // Get the existing search parameters from the URL

  const windowWidth = useWindowWidth();
  const user = getUserClient();
  const isChainAdmin = isChain(user?.role ?? "");

  const canChangeStoreSalesRep =
    isDistributorAdminAndExecutive(user?.role ?? "") &&
    DISTRIBUTOR_SALESREP_UPDATE;

  useEffect(() => {
    if (storesData) setStoreData(storesData);
  }, [storesData]);

  const params = new URLSearchParams(searchParams.toString());
  const [sort, setSort] = useState<Record<string, string>>(() => {
    const initialSort = params.get(SORT_KEYS.SORT);
    const initialPurchaseSort = params.get(SORT_KEYS.PURCHASE_VOLUME_SORT);

    if (initialSort) return { [SORT_KEYS.SORT]: initialSort };
    if (initialPurchaseSort)
      return { [SORT_KEYS.PURCHASE_VOLUME_SORT]: initialPurchaseSort };

    return { [SORT_KEYS.SORT]: "ASC" };
  });

  const resStartNum =
    currentPage == 1 ? currentPage : DEFAULT_PAGE_SIZE * (currentPage - 1) + 1;
  const resEndNum =
    currentPage * DEFAULT_PAGE_SIZE > totalStores
      ? totalStores
      : currentPage * DEFAULT_PAGE_SIZE;

  const handleSortChange = (key: string = SORT_KEYS.SORT) => {
    const sortDescFirstFor = [
      SORT_KEYS.PURCHASE_VOLUME_SORT,
      SORT_KEYS.SKUS,
      SORT_KEYS.PROGRAM_COMPLIANCE,
      SORT_KEYS.ESTIMATED_SAVINGS,
      SORT_KEYS.SAVINGS_Opp,
      SORT_KEYS.PR_AVAILABLE,
      SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE
    ];
    let sortVal;
    if (sortDescFirstFor.includes(key)) {
      sortVal = key in sort && sort?.[key] === "DESC" ? "ASC" : "DESC";
    } else {
      sortVal = key in sort && sort?.[key] === "ASC" ? "DESC" : "ASC";
    }

    setSort({ [key]: sortVal });

    const updatedQuery = generateQueryString(params, {
      sort: sortVal,
      sortKey: key,
      [pageVariable]: 1,
      s: params.get("s"),
      chainId: params.get("chainId"),
      dtId: params.get("dtId"),
      srId: params.get("srId"),
      prAvailable: params.get("prAvailable")
    });

    // Push the search query to the router
    router.push(`${location.pathname}?${updatedQuery}`);
  };

  const getSortIconSrc = (sort: string) => {
    let src = sortIconDefault.src;

    if (sort === "ASC") {
      src = sortIcon.src;
    } else if (sort === "DESC") {
      src = sortIconDesc.src;
    }
    return src;
  };
  const SortableHeader: React.FC<SortableHeaderProps> = ({
    label,
    sortKey,
    customLabel,
    customKey,
    sort,
    className = "font-semibold px-2 sm:px-4 cursor-pointer",
    handleSortChange
  }) => {
    const key = customKey || (sortKey ? SORT_KEYS[sortKey] : "");

    return (
      <th className={className} onClick={() => handleSortChange(key)}>
        <span className="inline mr-2">{customLabel || label}</span>
        {sortKey && (
          <Image
            className="storeSortIcon inline"
            src={getSortIconSrc(sort?.[key])}
            alt="sort icon"
            width={7}
            height={10}
          />
        )}
      </th>
    );
  };

  return (
    <div
      id={id}
      className="storeTable text-left text-sm text-filter-light font-medium font-inter"
    >
      <div className="overflow-x-auto overflow-y-scroll max-h-[60vh]">
        <table className="w-full border-collapse">
          <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white z-[1]">
            <tr>
              <SortableHeader
                className="font-semibold px-2 sm:px-4 cursor-pointer w-64"
                label="Store"
                sortKey="SORT"
                sort={sort}
                handleSortChange={handleSortChange}
              />

              {!isChainAdmin && (
                <SortableHeader
                  className="font-semibold px-2 sm:px-4 w-48 cursor-pointer"
                  label="Chain"
                  sortKey="CHAIN"
                  sort={sort}
                  handleSortChange={handleSortChange}
                />
              )}
              <SortableHeader
                className="font-semibold px-2 sm:px-4 w-48 cursor-pointer"
                label="My Earnings"
                sortKey="ESTIMATED_SAVINGS"
                sort={sort}
                handleSortChange={handleSortChange}
              />

              <SortableHeader
                className="font-semibold px-2 sm:px-4 w-48 cursor-pointer"
                label="Programs Available"
                sortKey="PR_AVAILABLE"
                sort={sort}
                handleSortChange={handleSortChange}
              />
            </tr>
          </thead>
          <tbody>
            {storeData.length ? (
              storeData?.map((store) => (
                <tr
                  key={store.id}
                  onClick={() =>
                    router.push(
                      `/app/store/spiff/${store.id}${isInternal ? "?isInternal=true" : ""}`
                    )
                  }
                  className="border-b hover:bg-gray-50 cursor-pointer align-middle"
                >
                  <td className="px-2 sm:px-4 py-3">
                    <div className="min-h-10 flex flex-col justify-center">
                      <p className="font-medium break-words break-before-all overflow-hidden text-ellipsis">
                        {store.storeInfo.name}
                      </p>
                      {!isEmptyString(store.storeInfo.location) && (
                        <span className="block text-xs text-heading-very-light">
                          {store.storeInfo.location}
                        </span>
                      )}
                      {store?.externalStoreId &&
                        !isEmptyString(store?.externalStoreId as string) && (
                          <span className="block text-xs text-heading-very-light font-medium">
                            {store.externalStoreId}
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <p className="break-words break-before-all overflow-hidden text-ellipsis">
                      {store.chainNames}
                    </p>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    {"$" +
                      formatNumber(
                        store.salesRepSpiffData?.totalSpiffEarning || 0
                      )}
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    {store?.salesRepSpiffData?.totalSpiffPrograms || 0}{" "}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b">
                <td className="px-2 sm:px-4 py-3" colSpan={4}>
                  <p className="text-center">{MESSAGES.NO_RECORDS_FOUND}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {storeData?.length > 0 && (
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
                const updatedQuery = generateQueryString(params, {
                  [pageVariable]: page,
                  sort: params.get("sort"),
                  s: params.get("s"),
                  chainId: params.get("chainId"),
                  dtId: params.get("dtId"),
                  srId: params.get("srId")
                });

                router.push(`${location.pathname}?${updatedQuery}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SpiffTable;
