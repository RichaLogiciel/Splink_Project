import Image from "next/image";
import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import { handleGoToValidation } from "@/utils/formHelper";

// Import Images
import leftArrow from "@/assets/icons/leftArrowIcon.svg";
import rightArrow from "@/assets/icons/rightArrowIcon.svg";

// Define the props type for the Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface Inputs {
  pageNum: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage: currentPageProp,
  totalPages: totalPagesProp,
  onPageChange
}) => {
  const currentPage = Number(currentPageProp);
  const totalPages = Number(totalPagesProp);

  const getPages = () => {
    const pages: (number | string)[] = [];

    if (totalPages >= 1) pages.push(1);

    if (currentPage > 3) pages.push("...");

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };
  const allPages = getPages();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const { pageNum } = data;

    if (pageNum && pageNum < totalPages) {
      onPageChange(pageNum);
      reset();
    }
  };

  return (
    <div className="pagination flex items-center justify-center gap-2 relative">
      <button
        className={`prev px-3 py-3 ${currentPage === 1 && "opacity-60"}`}
        onClick={() => onPageChange(currentPage > 1 ? currentPage - 1 : 1)}
        disabled={currentPage === 1}
      >
        <Image src={leftArrow.src} alt="Previous page" height={13} width={8} />
      </button>

      <div className="pages flex gap-2">
        {allPages.map((page, index) =>
          typeof page === "number" ? (
            <span
              key={index}
              onClick={() => onPageChange(page)}
              className={`cursor-pointer rounded-full p-1 min-w-7 text-center ${
                page == currentPage
                  ? "bg-highlighted-color text-white"
                  : "hover:bg-highlighted-color hover:text-white"
              }`}
            >
              {page}
            </span>
          ) : (
            <span key={index} className="p-1 min-w-7 text-center">
              {page}
            </span>
          )
        )}
      </div>

      <button
        className={`next px-3 py-3 ${
          currentPage === totalPages && "opacity-60"
        }`}
        onClick={() =>
          onPageChange(currentPage < totalPages ? currentPage + 1 : totalPages)
        }
        disabled={currentPage === totalPages}
      >
        <Image src={rightArrow.src} alt="Next page" height={13} width={8} />
      </button>

      {allPages.includes("...") && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register("pageNum", {
              max: {
                value: totalPages,
                message: "Max number should be less then total pages"
              },
              min: {
                value: 1,
                message: "Min number should be 1"
              },
              pattern: {
                value: /(^\d)/,
                message: "Page Number should be a number"
              }
            })}
            onInput={handleGoToValidation}
            placeholder="Page"
            className={`border rounded px-4 w-full focus:outline-none max-w-20 text-sm py-1.5 border-gray-300 focus:ring-2 focus:ring-primary/60 cursor-text outline-none ${errors.pageNum && "border-red-600"}`}
          />
          {errors.pageNum && (
            <span className="text-xs text-[#FF1010] absolute -bottom-5 right-0">
              {errors.pageNum.message}
            </span>
          )}
        </form>
      )}
    </div>
  );
};

export default Pagination;
