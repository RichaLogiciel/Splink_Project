"use client";

import Card from "@/components/Card/";
import { MESSAGES } from "@/configs/messages";
import { formatNumber } from "@/utils/numberFormatter";
import React, { useEffect, useRef, useState } from "react";
import SortableHeader from "../SortableHeader";

interface ListingDataTableProps {
  data: StoreEarningsDataType[];
  cardLabel?: string;
  isLargeCardLabel?: boolean;
  totalEarningOrSales?: string;
  largeHeight?: boolean;
  tableHeadings?: {
    column_1?: string;
    column_2?: string;
  };
}

interface StoreEarningsDataType {
  storeId: number;
  storeName: string;
  storeEarnings: number;
}

const ListingDataTable: React.FC<ListingDataTableProps> = ({
  data: unSortedData,
  cardLabel,
  totalEarningOrSales,
  isLargeCardLabel = false,
  largeHeight = false,
  tableHeadings
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>("DESC");
  const [sortKey, setSortKey] = useState<string>("storeEarnings");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState(
    unSortedData?.map((item, index) => ({
      ...item,
      order: index + 1
    }))
  );

  // Sync data state when unSortedData prop changes
  useEffect(() => {
    if (unSortedData) {
      setData(
        unSortedData.map((item, index) => ({
          ...item,
          order: index + 1
        }))
      );
    } else {
      setData([]);
    }
  }, [unSortedData]);

  const handleSort = (key: string) => {
    setIsLoading(true);
    try {
      switch (key) {
        case "storeName": // Sort by store name in ascending or descending order
          const sortedDataName = [...data].sort((a, b) => {
            return sortOrder === "DESC"
              ? a[key].localeCompare(b[key])
              : b[key].localeCompare(a[key]);
          });
          setData(sortedDataName);
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          setSortKey("storeName");
          break;
        case "storeEarnings": // Sort by store earnings in ascending or descending order
          const sortedData = [...data].sort((a, b) => {
            return sortOrder === "DESC" ? a[key] - b[key] : b[key] - a[key];
          });
          setData(sortedData);
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          setSortKey("storeEarnings");
          break;
        default:
          break;
      }
      tableContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (error) {
      console.log("error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <p
              className={`${isLargeCardLabel ? "text-base" : "text-xs"} font-normal text-heading-very-light mb-2`}
            >
              {cardLabel ? cardLabel : ""}
            </p>
            {/* {totalEarningOrSales && (
              <p className="text-base font-semibold">{totalEarningOrSales}</p>
            )} */}
          </div>
        </div>

        <div
          ref={tableContainerRef}
          id="distributorStoreEarningsTableContainer"
          className={`signedStoresTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter ${largeHeight ? "max-h-[50vh]" : "max-h-60"} ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <table
            id="distributorStoreEarningsTable"
            className="w-full border-collapse table-fixed"
          >
            <thead className="h-11 text-heading-very-light text-xs border-b border-border-gray sticky top-0 bg-white">
              <tr>
                <th className="font-medium pr-4 w-7">#</th>
                <SortableHeader
                  className="font-medium pr-4 w-full"
                  label={tableHeadings?.column_1 || "Store Name"}
                  sortKey={"storeName"}
                  sort={sortOrder}
                  customSortFunction={handleSort}
                  activeSortKey={sortKey}
                />
                <SortableHeader
                  className="font-medium pr-4 w-28"
                  label={tableHeadings?.column_2 || "Earnings"}
                  sortKey={"storeEarnings"}
                  customSortFunction={handleSort}
                  sort={sortOrder}
                  activeSortKey={sortKey}
                />
              </tr>
            </thead>
            <tbody>
              {data && data.length > 0 ? (
                data.map((item, index) => {
                  return (
                    <tr
                      key={`storenumber-${index}`}
                      className="border-b cursor-pointer hover:bg-gray-50"
                    >
                      <td className="pr-4 py-2.5">{item.order}.</td>
                      <td className="pr-4 py-2.5">{item.storeName}</td>
                      <td className="pr-4 py-2.5">
                        <div className="text-base font-semibold text-highlighted-color">
                          ${formatNumber(item?.storeEarnings ?? 0)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="pt-3" colSpan={3}>
                    <p className="text-center font-medium text-heading-very-light text-sm">
                      {MESSAGES.NO_RECORDS_FOUND}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

export default ListingDataTable;
