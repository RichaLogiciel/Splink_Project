"use client";

import React, { useEffect, useState } from "react";
import Row from "./Row";

import { USER_ROLES } from "@/configs/roles";
import { useRouter, useSearchParams } from "next/navigation";
import CreateNewProgram from "./Buttons/CreateNewProgram";
import DateRangeButton from "./DateRangeButton";
import CustomDropdown from "./Form/CustomDropdown";
import ProgramTimelineOptionSelector from "./OptionSelector/ProgramTimelineOptionSelector";
import ProgramsViewToggle from "./ProgramsViewToggle";
import { useROIView } from "@/contexts/ROIViewContext";

// interface ManufacturerTopInsightsData {
//   totalSales: {
//     [month: number]: {
//       totalSale: number;
//     };
//   };
//   totalDistributors: number;
//   storesCount: number;
//   activeProgramsCount: number;
// }

interface ManufacturerDashboardHeadProps {
  title: string;
  selectableEntities: {
    name: string;
    userId: number;
    associatedUserId: number;
  }[];
  subtitle?: string;
  products?: {
    name: string;
    id: number;
  }[];
  dateRangeMonths?: number[];
  selectedProductIds?: number[];
  activeMonth?: number;
  selectedYear?: number | null;
  previousYear?: number;
  onDateRangeClick?: (dateRange: number, year?: number | null) => void;
  onProductsFilterApply?: (ids: number[]) => void;
  onProductsFilterReset?: () => void;
  role?: string;
  showAddProgramBtn?: boolean;
  warehouses?: any[];
  showProgramFilterSwitch?: boolean;
  programTimeline?: string;
}

const ManufacturerDashboardHead = ({
  title,
  subtitle,
  selectableEntities,
  products,
  dateRangeMonths,
  activeMonth,
  selectedYear,
  previousYear,
  selectedProductIds,
  onDateRangeClick,
  onProductsFilterApply = (ids: number[]) => {},
  onProductsFilterReset = () => {},
  role = USER_ROLES.MANUFACTURER,
  showAddProgramBtn = false,
  warehouses,
  showProgramFilterSwitch = false,
  programTimeline
}: ManufacturerDashboardHeadProps) => {
  const [selectedEntity, setSelectedEntity] = useState("");
  const { setShowROIView } = useROIView();

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEntity(event.target.value);
  };

  const selectableEntityParamKey =
    role === USER_ROLES.MANUFACTURER ? "distributorId" : "manufacturerId";

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedEntity) {
      params.set(selectableEntityParamKey, selectedEntity);
    } else {
      params.delete(selectableEntityParamKey);
    }

    router.push(`${location.pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  return (
    <Row
      className="justify-between flex-col md:flex-row gap-y-3 md:gap-y-0"
      marginBottom="mb-4"
      gap="gap-3"
    >
      <div className="text-lg font-semibold">
        {title}
        {subtitle ? (
          <div className="text-xs font-medium text-heading-light">
            {subtitle}
          </div>
        ) : (
          <></>
        )}
      </div>
      <div className="flex gap-4">
        {showProgramFilterSwitch && <ProgramTimelineOptionSelector />}
        {!dateRangeMonths?.length && !products && !activeMonth ? (
          <div className="flex gap-6 text-sm font-medium items-center">
            <select
              id="select-entity"
              value={selectedEntity ?? ""}
              onChange={handleSelectChange}
              className="text-xs outline-none rounded p-2 border border-border-gray"
            >
              <option value={""}>All Distributors</option>
              {selectableEntities.map((entity) => (
                <option
                  key={entity.associatedUserId}
                  value={entity.associatedUserId}
                >
                  {entity.name}
                </option>
              ))}
            </select>
            <ProgramsViewToggle onViewChange={setShowROIView} />
            {/* <CardButton className="border border-border-gray bg-green">
          <div className="flex gap-2">
            <img src={DownloadIcon.src} alt="Download Icon"></img>
            <div className="text-white">Export csv</div>
          </div>
        </CardButton> */}
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-6 text-sm font-medium items-center gap-y-3">
            {warehouses && warehouses?.length > 1 && (
              <CustomDropdown
                excludePageParam={true}
                queryParamKey={"warehouseId"}
                options={[
                  {
                    label: "All Warehouses",
                    value: ""
                  },
                  ...warehouses.map((entity: any) => ({
                    label: entity.name,
                    value: entity.id
                  }))
                ]}
              />
            )}

            <CustomDropdown
              id="custom-dropdown"
              excludePageParam={true}
              queryParamKey={selectableEntityParamKey}
              options={[
                {
                  label:
                    role === USER_ROLES.MANUFACTURER
                      ? "All Distributors"
                      : "All Manufacturers",
                  value: ""
                },
                ...selectableEntities.map((entity: any) => ({
                  label: entity.name,
                  value: entity.associatedUserId
                }))
              ]}
            />
            {/* <MultiSelectOptionsModal
            options={products ?? []}
            handleApplyClick={onProductsFilterApply}
            handleResetClick={onProductsFilterReset}
            selectedOptionIds={selectedProductIds}s
          /> */}
            {dateRangeMonths?.length && activeMonth && onDateRangeClick && (
              <div id="date-range-buttons" className="flex gap-6">
                {previousYear && (
                  <DateRangeButton
                    key={`previous-year-${previousYear}`}
                    months={12}
                    year={previousYear}
                    activeMonth={activeMonth}
                    selectedYear={selectedYear}
                    onClick={() => onDateRangeClick(12, previousYear)}
                  />
                )}
                {dateRangeMonths?.map((dateRangeMonth, index) => (
                  <DateRangeButton
                    key={`${dateRangeMonth}-${index}`}
                    months={dateRangeMonth}
                    activeMonth={activeMonth}
                    selectedYear={selectedYear}
                    onClick={() => onDateRangeClick(dateRangeMonth, null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {showAddProgramBtn && <CreateNewProgram />}
      </div>
    </Row>
  );
};

export default ManufacturerDashboardHead;
