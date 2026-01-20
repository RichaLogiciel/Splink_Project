import React from "react";
import SelectFilter from "./SelectFilter";

// Import components

interface WarehouseSelectFilterProps {
  isManager: boolean;
  warehouses?: any[];
  onSelectChange?: (val: string) => void;
  forceUpdate?: boolean;
}

const WarehouseSelectFilter: React.FC<WarehouseSelectFilterProps> = ({
  isManager,
  warehouses,
  onSelectChange,
  forceUpdate = false
}) => {
  if (
    !isManager ||
    !warehouses?.length ||
    (warehouses?.length && warehouses?.length < 2)
  )
    return null;

  return (
    <SelectFilter
      queryParam="warehouseId"
      onSelectChange={onSelectChange}
      forceUpdate={forceUpdate}
      options={[
        { value: "", label: "All Warehouses" },
        // eslint-disable-next-line no-unsafe-optional-chaining
        ...warehouses?.map((sr: any) => ({
          value: sr.id,
          label: sr.name
        }))
      ]}
      className="text-xs outline-none rounded p-2 border border-border-gray"
    />
  );
};

export default WarehouseSelectFilter;
