import { apiClient } from "@/lib/axiosClient";
import {
  ENTITY_TYPES,
  ENTITY_TYPES_RESPONSE,
  PROGRAM_CALCULATION_TYPE,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA,
  PROGRAM_CRITERIA_VALUES,
  VISIBILITY_SCOPE
} from "@/views/Distributor/programConstants";
import { getUserClient } from "./getUserClient";
import { isDistributorAdmin } from "./rolesConditions";

export const productTagOptions = [
  { label: "Core_Wholesale", value: "Core_Wholesale" },
  { label: "Flex", value: "Flex" },
  { label: "Skin_Care", value: "Skin_Care" },
  { label: "Core_Retail", value: "Core_Retail" },
  { label: "Feminine_Care", value: "Feminine_Care" },
  { label: "Shave_Prep", value: "Shave_Prep" },
  { label: "Folgers", value: "Folgers" },
  { label: "JIF", value: "JIF" },
  { label: "Jam", value: "Jam" },
  { label: "Milk_Bone", value: "Milk_Bone" },
  { label: "Meow_Mix", value: "Meow_Mix" },
  { label: "1H_Shipper", value: "1H_Shipper" },
  { label: "2H Shipper", value: "2H Shipper" },
  { label: "Single_Serve", value: "Single_Serve" },
  { label: "Bag Donettes", value: "Bag Donettes" },
  { label: "Bread&Buns", value: "Bread&Buns" },
  { label: "Display", value: "Display" },
  { label: "Salty_Snacks", value: "Salty_Snacks" },
  { label: "10oz", value: "10oz" },
  { label: "4oz", value: "4oz" },
  { label: "15oz", value: "15oz" },
  { label: "Core_Display", value: "Core_Display" },
  { label: "Cold_Crafted", value: "Cold_Crafted" },
  { label: "Take_Home", value: "Take_Home" },
  { label: "Toggi_Innovation", value: "Toggi_Innovation" },
  { label: "CoreWholesale", value: "CoreWholesale" },
  { label: "80ct", value: "80ct" },
  { label: "Beverage", value: "Beverage" },
  { label: "Required", value: "Required" },
  { label: "STP_PWRSTR", value: "STP_PWRSTR" },
  { label: "STP_BRKFL", value: "STP_BRKFL" },
  { label: "F&O_ADD", value: "F&O_ADD" },
  { label: "Armor_All", value: "Armor_All" },
  { label: "Air_Fresh", value: "Air_Fresh" },
  { label: "Tic_Tac_Display", value: "Tic_Tac_Display" },
  { label: "Kinder_Display", value: "Kinder_Display" },
  { label: "BF_Display", value: "BF_Display" },
  { label: "Carousel", value: "Carousel" },
  { label: "Other", value: "Other" },
  { label: "Bakeshop", value: "Bakeshop" },
  { label: "Innovation", value: "Innovation" },
  { label: "PIM_Sub", value: "PIM_Sub" },
  { label: "ENGB_Tier I", value: "ENGB_Tier I" },
  { label: "ENGB_Tier II+", value: "ENGB_Tier II+" },
  { label: "Suncare", value: "Suncare" },
  { label: "2H_Shipper", value: "2H_Shipper" },
  { label: "Shipper", value: "Shipper" },
  { label: "Slice", value: "Slice" },
  { label: "Tire_Fix", value: "Tire_Fix" },
  { label: "Prepack_Display", value: "Prepack_Display" }
];

export const getCriteriaLabel = (criteria: string) => {
  switch (criteria) {
    case PROGRAM_CRITERIA_VALUES.BASE:
      return PROGRAM_CRITERIA.BASE;
    case PROGRAM_CRITERIA_VALUES.BASE_SPIFF:
      return PROGRAM_CRITERIA.BASE_SPIFF;
    case PROGRAM_CRITERIA_VALUES.PURCHASE_VALUE:
      return PROGRAM_CRITERIA.PURCHASE_VALUE;
    case PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY:
      return PROGRAM_CRITERIA.PURCHASE_QUANTITY;
    case PROGRAM_CRITERIA_VALUES.CATEGORY_SKUS:
      return PROGRAM_CRITERIA.CATEGORY_SKUS;
    case PROGRAM_CRITERIA_VALUES.GROWTH:
      return PROGRAM_CRITERIA.GROWTH;
    case PROGRAM_CRITERIA_VALUES.OUTREACH:
      return PROGRAM_CRITERIA.OUTREACH;
    case PROGRAM_CRITERIA_VALUES.POD:
      return PROGRAM_CRITERIA.POD;
    case PROGRAM_CRITERIA_VALUES.PER_ITEM:
      return PROGRAM_CRITERIA.PER_ITEM;
    default:
      return criteria;
  }
};

export const getCalculationTypeLabel = (calculationType: string) => {
  switch (calculationType) {
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT:
      return PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT;
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_PER_ITEM:
      return PROGRAM_CALCULATION_TYPE.FIXED_PER_ITEM;
    case PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE:
      return PROGRAM_CALCULATION_TYPE.LANDED_VALUE;
    case PROGRAM_CALCULATION_TYPE_VALUES.LIST_VALUE:
      return PROGRAM_CALCULATION_TYPE.LIST_VALUE;
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE:
      return PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_STORE_COMPLIANCE;
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
      return PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE;
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE:
      return PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_ITEM_PER_STORE;
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY:
      return PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_QUANTITY;
    default:
      return calculationType;
  }
};

export const getReadableRebateValue = (
  calculationType: string,
  rebateValue: number
) => {
  if (!calculationType || !rebateValue) return "";
  switch (calculationType) {
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_PER_ITEM:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY:
      return `$${rebateValue}`;
    case PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE:
    case PROGRAM_CALCULATION_TYPE_VALUES.LIST_VALUE:
      return `${rebateValue}%`;
    default:
      return calculationType;
  }
};

export const getRebateType = (calculationType: string) => {
  if (!calculationType) return "";
  switch (calculationType) {
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_PER_ITEM:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL:
      return "fixed";
    case PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE:
    case PROGRAM_CALCULATION_TYPE_VALUES.LIST_VALUE:
      return "percentage";
    default:
      return "";
  }
};

export const getRebateCalculationType = (calculationType: string) => {
  if (!calculationType) return "";
  switch (calculationType) {
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT:
    case PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE:
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY:
      return "landed_value";
    case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_PER_ITEM:
    case PROGRAM_CALCULATION_TYPE_VALUES.LIST_VALUE:
      return "list_value";
    default:
      return "";
  }
};

export const getParticipants = ({
  participantType,
  isAllStores,
  isAllDistributors,
  isAllSalesReps,
  selectedStores,
  selectedDistributors
}: {
  participantType?: string;
  isAllStores: boolean;
  isAllSalesReps: boolean;
  isAllDistributors: boolean;
  selectedStores?: any[];
  selectedDistributors?: any[];
}) => {
  switch (participantType) {
    case ENTITY_TYPES.STORE:
      return isAllStores
        ? "All Stores"
        : selectedStores?.length
          ? `${selectedStores.length} Stores`
          : "No Stores Selected";
    case ENTITY_TYPES.DISTRIBUTOR:
      return isAllDistributors
        ? "All Distributors"
        : selectedDistributors?.length
          ? `${selectedDistributors.length} Distributors`
          : "No Distributors Selected";
    case ENTITY_TYPES.SALES_REP:
      return isAllSalesReps
        ? "All Sales Reps"
        : selectedDistributors?.length
          ? `${selectedDistributors.length} Distributor Selected`
          : "No Distributor Selected";
    default:
      return "";
  }
};

export const getVisibilityScope = (
  participantType: string,
  isAllStores: boolean,
  isAllDistributors: boolean,
  isAllSalesReps: boolean
) => {
  switch (participantType) {
    case ENTITY_TYPES.STORE:
      return isAllStores
        ? VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
        : VISIBILITY_SCOPE.SPECIFIC_STORES;
    case ENTITY_TYPES.DISTRIBUTOR:
      return isAllDistributors
        ? VISIBILITY_SCOPE.ALL_DISTRIBUTORS
        : VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS;
    case ENTITY_TYPES.SALES_REP:
      return isAllSalesReps
        ? VISIBILITY_SCOPE.ALL_SALES_REPS
        : VISIBILITY_SCOPE.SPECIFIC_SALES_REPS;
    default:
      return "";
  }
};

export const getParticipantType = (participantType: string) => {
  switch (participantType) {
    case ENTITY_TYPES.STORE:
      return ENTITY_TYPES_RESPONSE.STORE;
    case ENTITY_TYPES.DISTRIBUTOR:
      return ENTITY_TYPES_RESPONSE.DISTRIBUTOR;
    case ENTITY_TYPES.SALES_REP:
      return ENTITY_TYPES_RESPONSE.SALES_REP;
    default:
      return "";
  }
};

export const fetchProductTags = async (manufacturerId: number) => {
  try {
    const { data } = await apiClient.get(
      `/store/manufacturer/${manufacturerId}/product-tags`
    );
    if (data?.tags) {
      const tags = data?.tags?.map((tag: string) => ({
        label: tag,
        value: tag
      }));
      return tags;
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching product tags:", error);
    return [];
  }
};

export const fetchManufacturerProducts = async (manufacturerId: number) => {
  try {
    const user = getUserClient();
    const isDistAdmin = isDistributorAdmin(user?.role || "");

    const { data } = await apiClient.get(
      `/store/manufacturer/${manufacturerId}/product-tags`
    );
    if (data?.products) {
      const sortedProducts = data?.products?.sort((a: any, b: any) => {
        // First sort by internal code presence
        if (a.internal_code && !b.internal_code) return -1;
        if (!a.internal_code && b.internal_code) return 1;
        // Then sort by product name
        return a.name.localeCompare(b.name);
      });
      const products = sortedProducts?.map((product: any) => ({
        label: product.name,
        description: `UPC: ${
          product.case_skus_id || product.box_skus_id || product.unit_skus_id
        } ${isDistAdmin ? `<br />Internal Code: ${product.internal_code || "N/A"}` : ""}`.trim(),
        value: product.id
      }));
      return products;
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching manufacturer products:", error);
    return [];
  }
};
