"use client";
import Image from "next/image";

import sortIcon from "@/assets/icons/sortIcon.svg";
import sortIconDefault from "@/assets/icons/sortIconDefault.svg";
import sortIconDesc from "@/assets/icons/sortIconDesc.svg";
import { generateQueryString } from "@/utils/helper";
import { useRouter, useSearchParams } from "next/navigation";

export default function SortableHeader({
  label,
  sortKey,
  sort = "ASC",
  className = "px-2 sm:px-4",
  sortFor,
  customSortFunction,
  activeSortKey
}: {
  label: string;
  sortKey: string;
  sort?: string;
  className?: string;
  sortFor?: string;
  customSortFunction?: (key: string) => void;
  activeSortKey?: string;
}) {
  const router = useRouter();

  const searchParams = useSearchParams(); // Get the current search parameters
  const params = new URLSearchParams(searchParams.toString());

  const key = activeSortKey || searchParams.get("sortKey") || "";

  const getSortIconSrc = (sort: string, sortKey: string) => {
    let src = sortIconDefault.src;

    if (sort === "ASC" && sortKey === key) {
      src = sortIcon.src;
    } else if (sort === "DESC" && sortKey === key) {
      src = sortIconDesc.src;
    }
    return src;
  };

  const handleSortChange = (key: string) => {
    if (customSortFunction) {
      customSortFunction(key);
      return;
    }
    const sortOrder = searchParams.get("sort");
    const sortVal = sortOrder === "DESC" ? "ASC" : "DESC";

    const updatedQuery = generateQueryString(params, {
      sort: sortVal,
      sortKey: key,
      sortFor: sortFor
    });

    // Push the search query to the router
    router.push(`${location.pathname}?${updatedQuery}`, { scroll: false });
  };

  return (
    <th
      className={`font-semibold cursor-pointer ${className}`}
      onClick={() => handleSortChange(sortKey)}
    >
      <span className="inline mr-2">{label}</span>
      {sortKey && (
        <Image
          className="storeSortIcon inline"
          src={getSortIconSrc(sort, sortKey)}
          alt="sort icon"
          width={7}
          height={10}
        />
      )}
    </th>
  );
}
