"use client";

import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import redCircleCrossIcon from "@/assets/icons/redCircleCrossIcon.svg";
import whiteFilterIcon from "@/assets/icons/whiteFilterFunnel.svg";
import DatePickerField from "@/components/Form/DatePickerField";
import MultiSelect from "@/components/Form/MultiSelect";
import SelectBox from "@/components/Form/SelectBox";
import Loader from "@/components/Loader";
import { apiClient } from "@/lib/axiosClient";
import {
  fetchManufacturerProducts,
  fetchProductTags
} from "@/utils/createProgramUtils";
import { getUserClient } from "@/utils/getUserClient";
import { formatNumber } from "@/utils/numberFormatter";
import {
  getManufacturerId,
  isDistributorAdmin,
  isManufacturer
} from "@/utils/rolesConditions";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "react-toastify";

const operatorOptions = [
  { label: ">=", value: ">=" },
  { label: "<", value: "<" },
  { label: "Between", value: "between" }
];

interface CategoryOption {
  label: string;
  value: string;
}

interface Rule {
  id: string;
  type: string;
  category: CategoryOption | string | null;
  operator: string;
  value1: number | any[];
  value2?: number | any[];
  startDate?: Date | null;
  endDate?: Date | null;
  chains?: { label: string; value: string }[];
  products?: { label: string; value: string }[];
}

interface Store {
  id: number;
  name: string;
  chain: string;
  volume: string;
  skus: number;
  distributor: string;
  sales_rep: string;
  sales_rep_id: string;
}

interface SalesRepSelectionModalProps {
  onClose: () => void;
  distributors: { label: string; value: string }[];
  onSalesRepSelect: (stores: string[], excludedStores: number[]) => void;
}

const transformRulesForApi = (rules: Rule[]): any[] => {
  return rules.flatMap((rule): any => {
    // skip if rule.chain is not defined
    if (!rule.type) return [];

    const categoryValue =
      typeof rule.category === "string" ? rule.category : rule.category?.value;

    const basePayload = {
      type: rule.type,
      category: categoryValue,
      operator: rule.operator,
      startDate: rule.startDate || undefined,
      endDate: rule.endDate || undefined
    };

    if (rule.type === "customer_chain") {
      const chains = rule.chains?.map((chain) => chain?.value)?.join(",");
      if (!chains) return [];
      return {
        ...basePayload,
        category: undefined,
        operator: "in",
        chains: chains
      };
    }

    if (rule.type === "specific_product") {
      const products = rule.products
        ?.map((product) => product?.value)
        ?.join(",");
      if (!products) return [];
      return {
        ...basePayload,
        category: undefined,
        products: products,
        operator: rule.operator,
        value1: rule.value1,
        value2: rule.value2
      };
    }

    if (rule.operator === "between") {
      return [
        {
          ...basePayload,
          operator: "between",
          value1: rule.value1,
          value2: rule.value2
        }
      ];
    }

    return {
      ...basePayload,
      value: rule.value1
    };
  });
};

const fetchFilteredStores = async ({
  rules,
  manufacturerId,
  distributors,
  salesRepIds
}: {
  rules: Rule[];
  manufacturerId?: number;
  distributors?: string[];
  salesRepIds?: string[];
}): Promise<Store[]> => {
  try {
    if (!manufacturerId) {
      toast.error("Error getting the manufacturer id");
      return [];
    }

    const formattedRules = transformRulesForApi(rules);

    const { data } = await apiClient.post(
      `/store/manufacturer/${manufacturerId}`,
      {
        distributor_ids: distributors,
        sales_rep_ids: salesRepIds,
        criteria: {
          rules: formattedRules
        }
      }
    );
    if (!data || !data?.length) return [];
    return data;
  } catch (error: any) {
    console.error("Error fetching stores:", error);
    return [];
  }
};

const fetchStoreChains = async (distributorIds: string[]) => {
  const { data } = await apiClient.get(
    `/store/get-store-chains?distributorID=${distributorIds}`
  );
  if (!data || !data?.length) return [];
  data.unshift({
    name: "All Chains",
    id: data.map((chain: any) => chain.id)
  });
  return data;
};

const SalesRepSelectionModal = ({
  onClose,
  distributors,
  onSalesRepSelect
}: SalesRepSelectionModalProps) => {
  const { control, setValue, watch, register } = useFormContext();
  const [showStoreList, setShowStoreList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  const [excludedStores, setExcludedStores] = useState<number[]>([]);
  const [selectedSalesReps, setSelectedSalesReps] = useState<string[]>([]);
  const [allSalesReps, setAllSalesReps] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);
  const [storeChains, setStoreChains] = useState<
    { label: string; value: string }[]
  >([]);
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string; description?: string }[]
  >([]);
  const initialLoad = useRef(true);
  const errorShown = useRef(false);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const [productTagOptions, setProductTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  // const [nacsTagOptions, setNacsTagOptions] = useState<
  //   { label: string; value: string }[]
  // >([]);
  const [selectedRuleType, setSelectedRuleType] = useState<string[]>([""]);

  const user = getUserClient();
  const isDistributor = isDistributorAdmin(user?.role || "");
  const isManufacturerAccount = isManufacturer(user?.role || "");

  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  const distributorId = isDistributor ? user?.associatedUserId : 1;

  const watchedDistributors = watch("store_selection_distributors");
  const existingSelectedStores = watch("selected_stores") || [];
  const existingExcludedStores = watch("excluded_stores") || [];
  const existingSelectedSalesReps = watch("selected_sales_reps") || [];
  const existingRules = watch("store_selection_rules") || [];
  const selectedDistributors = useMemo(
    () =>
      isManufacturerAccount
        ? watchedDistributors || []
        : [{ value: distributorId }],
    [isManufacturerAccount, watchedDistributors, distributorId]
  );

  const distributorOptions = [
    { label: "All Distributors", value: "ALL" },
    ...distributors
  ];

  const loadStores = async () => {
    const salesRepSelected = watch("sales_reps_selected");
    try {
      if (!manufacturerId) {
        if (!errorShown.current) {
          toast.error("Error getting the manufacturer id");
          errorShown.current = true;
        }
        return;
      }

      const distributors = selectedDistributors?.map((d: any) => d.value);
      if (distributors.length === 0) {
        if (!errorShown.current && isDirty) {
          toast.error("Please select at least one distributor");
          errorShown.current = true;
        }
        setFilteredStores([]);
        setSelectedStores([]);
        setExcludedStores([]);
        setSelectedSalesReps([]);
        return;
      }

      // Reset error shown flag when we have valid data
      errorShown.current = false;

      // Validate between operator rules
      const hasInvalidBetweenRule = rules.some(
        (rule) =>
          rule.operator === "between" &&
          (rule.value2 === undefined || rule.value2 === null)
      );

      if (hasInvalidBetweenRule) {
        toast.error("Please fill both values for 'between' operator");
        return;
      }
      if (!initialLoad.current) {
        const hasEmptyRule = rules.some(
          (rule) =>
            !rule.type ||
            (rule.type === "customer_chain" && !rule.chains?.length) ||
            (rule.type === "product" && !rule.products?.length)
        );

        if (
          hasEmptyRule &&
          (!salesRepSelected || salesRepSelected?.length === 0)
        ) {
          return;
        }
      }

      setIsLoading(true);
      const allRules =
        existingRules.length && existingRules.length > 0
          ? existingRules
          : rules;
      setValue("store_selection_rules", []);

      // Get sales rep IDs
      const salesRepIds =
        salesRepSelected?.length > 0
          ? salesRepSelected
              .map((salesRep: any) =>
                String(salesRep.value).includes(",")
                  ? String(salesRep.value).split(",")
                  : String(salesRep.value)
              )
              .flat()
          : undefined;

      const stores = await fetchFilteredStores({
        manufacturerId,
        distributors,
        rules: allRules,
        salesRepIds
      });

      setFilteredStores(stores);
      // Select all stores after fetching
      setSelectedStores(
        existingSelectedStores.length === 0
          ? stores?.map((store) => store.id)
          : existingSelectedStores
      );

      // Only reset excluded_stores when applying new filters, not on initial load
      if (isDirty || existingExcludedStores.length === 0) {
        setValue("selected_stores", []);
        setValue("excluded_stores", []);
      }

      setSelectedSalesReps(
        Array.from(
          new Set(
            stores
              .map((store) => {
                if (store.sales_rep_id?.includes(",")) {
                  return store.sales_rep_id?.split(",").map((id) => id.trim());
                }
                return [store.sales_rep_id];
              })
              .flat()
          )
        )
      );
    } catch (error: any) {
      console.log("error", error);
      toast.error(error?.data || "Error fetching stores");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductTags = useCallback(async () => {
    if (!manufacturerId) return;
    const manufacturerTags = await fetchProductTags(manufacturerId);

    setProductTagOptions([...manufacturerTags]);
  }, [manufacturerId]);

  const loadProducts = useCallback(async () => {
    fetchManufacturerProducts(manufacturerId).then(setProductOptions);
  }, [manufacturerId]);

  // Load store chains
  const loadStoreChains = useCallback(async () => {
    if (selectedDistributors?.length > 0) {
      const chains = await fetchStoreChains(
        selectedDistributors?.map((d: any) => d.value)?.join(",")
      );
      if (chains?.length > 0) {
        setStoreChains(
          chains.map((chain: any) => ({
            label: chain.name,
            value: chain.id
          }))
        );
      }
    }
  }, [selectedDistributors]);

  const loadSalesReps = useCallback(async () => {
    const { data } = await apiClient.get(
      `/store/getSalesReps/${distributorId}`
    );
    const salesReps = data?.salesReps?.map((rep: any) => ({
      label: rep.name,
      value: rep.associatedUserId
    }));
    if (salesReps?.length > 0) {
      const ids = salesReps
        .map((rep: any) => rep.value)
        .filter((id: any) => id != null)
        .join(",");
      salesReps?.unshift({
        label: "All Sales Reps",
        value: ids
      });
    }
    setAllSalesReps(salesReps);
  }, [distributorId]);

  // Load store chains on mount and when selected distributors change
  useEffect(() => {
    if (selectedDistributors?.length > 0) {
      loadStoreChains();
    } else {
      setStoreChains([]);
    }
    // Reset customer chain rule when distributors change
    rules.forEach((rule) => {
      setValue(`rule_${rule.id}_customer_chain_rule`, []);
    });
  }, [selectedDistributors]);

  // Load initial stores and rules
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;

      // Load products and product tags
      loadProducts();
      loadProductTags();

      if (existingRules.length > 0) {
        setRules(existingRules);
        setSelectedRuleType(existingRules.map((rule: any) => rule.type));
      }

      if (!isManufacturerAccount) {
        loadSalesReps();
      }

      if (existingSelectedStores.length === 0) {
        loadStores();
      } else {
        // Set existing selections
        setSelectedStores(existingSelectedStores);
        setSelectedSalesReps(existingSelectedSalesReps);
      }

      // Always initialize excludedStores if they exist
      if (existingExcludedStores.length > 0) {
        setExcludedStores(existingExcludedStores);
      }

      // Fetch store details and update filtered stores
      // After fetching store details, update the sales rep selection
      const salesRepIds = Array.from(
        new Set(
          filteredStores
            .filter((store) => existingSelectedStores.includes(store.id))
            .map((store) => {
              if (store.sales_rep_id?.includes(",")) {
                return store.sales_rep_id?.split(",").map((id) => id.trim());
              }
              return [store.sales_rep_id];
            })
            .flat()
        )
      );
      setSelectedSalesReps(salesRepIds);
    }
  }, []);

  // Load stores when rules or distributors change
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (!isDirty) setIsDirty(true);
      loadStores();
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [selectedDistributors, watch("sales_reps_selected")]);

  // Load stores when rules are empty
  useEffect(() => {
    const areRulesEmpty = rules.length === 0;
    if (areRulesEmpty && !initialLoad.current) {
      loadStores();
    }
  }, [rules]);

  // Reset excludedStores when filteredStores changes (new filter applied)
  useEffect(() => {
    if (filteredStores.length > 0 && isDirty) {
      // Only clear excludedStores when new filters are applied (not on initial load)
      setExcludedStores([]);
      setValue("excluded_stores", []);
    }
  }, [filteredStores.length, isDirty]);

  // Update selected stores when filtered stores change
  useEffect(() => {
    if (filteredStores.length > 0) {
      const validStoreIds = filteredStores.map((store) => store.id);

      // If we have existing excluded stores, calculate selected stores as filteredStores - excludedStores
      if (existingExcludedStores.length > 0) {
        const selectedIds = validStoreIds.filter(
          (id) => !existingExcludedStores.includes(id)
        );
        setSelectedStores(selectedIds);
        setExcludedStores(
          existingExcludedStores.filter((id: any) => validStoreIds.includes(id))
        );

        const salesRepIds = Array.from(
          new Set(
            filteredStores
              .filter((store) => selectedIds.includes(store.id))
              .map((store) => {
                if (store.sales_rep_id?.includes(",")) {
                  return store.sales_rep_id?.split(",").map((id) => id.trim());
                }
                return [store.sales_rep_id];
              })
              .flat()
          )
        );
        setSelectedSalesReps(salesRepIds);
      } else if (
        existingSelectedStores.length === 0 ||
        existingSelectedStores.length === filteredStores.length
      ) {
        // If all stores were previously selected, select all again
        const newIds = filteredStores.map((store) => store.id);
        setSelectedStores(newIds);

        const salesRepIds = Array.from(
          new Set(
            filteredStores
              .filter((store) => newIds.includes(store.id))
              .map((store) => {
                if (store.sales_rep_id?.includes(",")) {
                  return store.sales_rep_id?.split(",").map((id) => id.trim());
                }
                return [store.sales_rep_id];
              })
              .flat()
          )
        );
        setSelectedSalesReps(salesRepIds);
      } else {
        // Otherwise, keep only the stores that are in filteredStores
        const filteredSelected = existingSelectedStores.filter((id: any) =>
          validStoreIds.includes(id)
        );
        setSelectedStores(filteredSelected);

        const salesRepIds = Array.from(
          new Set(
            filteredStores
              .filter((store) => filteredSelected.includes(store.id))
              .map((store) => {
                if (store.sales_rep_id?.includes(",")) {
                  return store.sales_rep_id
                    ?.split(",")
                    .map((id) => id.trim())
                    .filter((id: any) => filteredSelected.includes(id));
                }
                return [store.sales_rep].filter((id: any) =>
                  filteredSelected.includes(id)
                );
              })
              .flat()
          )
        );
        setSelectedSalesReps(salesRepIds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStores]);

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "",
        category: productTagOptions?.[0]?.value || "Select a category",
        operator: "<",
        value1: 0,
        startDate: null,
        endDate: null
      }
    ]);
  };

  const removeRule = (id: string) => {
    setSelectedRuleType((prev) => prev.filter((rule) => rule !== id));
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const updateRule = (index: number, updates: Partial<Rule>) => {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[index] = { ...newRules[index], ...updates };
      return newRules;
    });
  };

  const handleSave = () => {
    setValue("store_selection_rules", rules);
    setValue("selected_sales_reps", selectedSalesReps);
    setValue("selected_stores", selectedStores);
    setValue("excluded_stores", excludedStores);

    onSalesRepSelect(selectedSalesReps, excludedStores);
    onClose();
  };

  useEffect(() => {
    const salesRepIds = Array.from(
      new Set(
        filteredStores
          .filter((store) => selectedStores.includes(store.id))
          .map((store) => {
            if (store.sales_rep_id?.includes(",")) {
              return store.sales_rep_id?.split(",").map((id) => id.trim());
            }
            return [store.sales_rep_id];
          })
          .flat()
          .filter((id: any) => id != null)
      )
    );
    setSelectedSalesReps(salesRepIds);
  }, [selectedStores]);

  return (
    <>
      <div className="flex items-center mb-5 gap-3.5">
        <button onClick={onClose}>
          <Image src={leftArrowIcon} width={7} height={7} alt="Close" />
        </button>
        <h2 className="text-lg font-semibold text-highlighted-color">
          Select Sales Reps
        </h2>
      </div>

      <div
        className={`relative bg-white p-3 sm:p-6 rounded-lg ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {isLoading && (
          <Loader
            className="absolute top-[calc(50%-60px)] left-1/2 z-50"
            show={false}
          />
        )}
        {isManufacturerAccount && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold mb-3">BY DISTRIBUTORS</h3>
            <div className="flex gap-2 items-center">
              <span className="text-xs">Select Distributors</span>
              <MultiSelect
                containerClass="mb-0"
                name="store_selection_distributors"
                control={control}
                options={distributorOptions}
                placeholder="Select Distributors"
                className="text-sm min-w-64 "
              />
            </div>
          </div>
        )}

        {!isManufacturerAccount && (
          <div className="flex gap-2 items-center mb-6">
            <span className="text-xs min-w-28">Select Sales Reps</span>
            <MultiSelect
              {...register("sales_reps_selected", {
                required: "Please select at least one sales rep"
              })}
              containerClass="mb-0"
              control={control}
              options={allSalesReps}
              placeholder="Select Sales Reps"
              className="text-sm min-w-64"
              defaultValue={allSalesReps?.[0] as any}
            />
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xs font-semibold mb-4 ">
            Select Sales Rep Eligibility Based on Store Criteria
          </h3>
          <div className="bg-[#F5F5F6] p-3 rounded-md sm:w-max md:min-w-[650px] lg:min-w-[800px] sm:max-w-[95%] mb-6">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className="flex flex-col gap-2 text-sm mb-5 shadow-sm p-2 rounded-md bg-white"
              >
                {/* Rule Type Dropdown */}
                <div className="mt-2 text-xs">
                  <label
                    htmlFor="rule-type-select"
                    className="text-xs font-medium flex justify-between gap-3 mb-2"
                  >
                    Select Rule {index + 1} Type
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          removeRule(rule.id);
                          setSelectedRuleType((prev) => {
                            const newTypes = [...prev];
                            newTypes.splice(index, 1);
                            return newTypes;
                          });
                        }}
                      >
                        <Image
                          src={redCircleCrossIcon}
                          width={18}
                          height={18}
                          alt="Remove"
                        />
                      </button>
                    </div>
                  </label>
                  <SelectBox
                    id="rule-type-select"
                    options={[
                      { label: "Choose a rule type", value: "" },
                      {
                        label: "Chain Name",
                        value: "customer_chain"
                      },
                      {
                        label: "Carrying Specific Product(s)",
                        value: "specific_product"
                      },
                      {
                        label: "Carrying Products from Category(s)",
                        value: "category"
                      }
                    ]}
                    value={selectedRuleType[index] || ""}
                    placeholder="Select Rule Type"
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSelectedRuleType((prev) => {
                        const newTypes = [...prev];
                        newTypes[index] = e.target.value;
                        return newTypes;
                      });

                      updateRule(index, {
                        type: e.target.value
                      });
                    }}
                    className="w-72 px-3 py-2 border rounded"
                    name={`rule_${rule.id}_type`}
                  />
                </div>
                <div className="mb-2">
                  {/* Dynamic Rule Config UI */}
                  {selectedRuleType[index] === "customer_chain" && (
                    // {/* Customer / Chain Name UI */}
                    <MultiSelect
                      multiSelect={true}
                      containerClass=""
                      className="w-full"
                      control={control}
                      options={storeChains}
                      placeholder="Search by customer name, internal ID, or chain name"
                      name={`rule_${rule.id}_customer_chain_rule`}
                      customOnChange
                      onChange={(val: any) => {
                        updateRule(index, {
                          chains: val,
                          type: "customer_chain"
                        });
                      }}
                    />
                  )}
                  {selectedRuleType[index] === "specific_product" && (
                    // Carrying Specific Product(s) UI
                    <div className="grid gap-2.5">
                      <MultiSelect
                        multiSelect={true}
                        containerClass="max-w-full col-span-2"
                        className="w-full"
                        control={control}
                        options={productOptions}
                        placeholder="Search by product name, UPC, or distributor code"
                        name={`rule_${rule.id}_specific_product_rule`}
                        customOnChange
                        onChange={(val: any) => {
                          updateRule(index, {
                            products: val,
                            type: "specific_product"
                          });
                        }}
                      />
                      <div className="flex gap-2.5 items-center">
                        <div className="w-1/2 flex gap-2.5">
                          <DatePickerField
                            control={control}
                            name={`rule_${rule.id}_specific_product_rule_start_date`}
                            placeholder="Start Date"
                            onChange={(date) => {
                              updateRule(index, {
                                startDate: date
                              });
                            }}
                            showMonthDropdown
                            showYearDropdown
                          />
                          <DatePickerField
                            name={`rule_${rule.id}_specific_product_rule_end_date`}
                            control={control}
                            placeholder="End Date"
                            minDate={
                              control._formValues[
                                `rule_${rule.id}_specific_product_rule_start_date`
                              ]
                            }
                            onChange={(date) => {
                              updateRule(index, {
                                endDate: date
                              });
                            }}
                            showMonthDropdown
                            showYearDropdown
                          />
                        </div>
                        <div className="w-40">
                          <SelectBox
                            options={operatorOptions}
                            value={rule.operator}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>
                            ) => {
                              updateRule(index, { operator: e.target.value });
                            }}
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                        <div
                          className={`w-44 grid ${rule.operator === "between" ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}
                        >
                          <input
                            type="number"
                            className="flex-1 px-3 py-2 border rounded"
                            value={rule.value1}
                            onChange={(e) =>
                              updateRule(index, {
                                value1: Number(e.target.value)
                              })
                            }
                          />
                          {rule.operator === "between" && (
                            <input
                              type="number"
                              className="flex-1 px-3 py-2 border rounded"
                              value={rule.value2 || ""}
                              onChange={(e) =>
                                updateRule(index, {
                                  value2: Number(e.target.value)
                                })
                              }
                              required={rule.operator === "between"}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedRuleType[index] === "category" && (
                    //Carrying Products from Category(s) UI
                    <div className="grid gap-2.5">
                      <div className="flex items-center gap-3">
                        <MultiSelect
                          multiSelect={false}
                          containerClass=""
                          className="min-w-80 w-full"
                          control={control}
                          options={productTagOptions}
                          placeholder="Select Category"
                          name={`rule_${rule.id}_category`}
                          defaultValue={
                            (rule?.category as any) || productTagOptions?.[0]
                          }
                          customOnChange
                          onChange={(val: any) => {
                            updateRule(index, { category: val });
                          }}
                        />
                      </div>
                      <div className="flex gap-2.5 items-center">
                        <div className="w-1/2 flex gap-2.5">
                          <DatePickerField
                            control={control}
                            name={`rule_${rule.id}_category_rule_start_date`}
                            placeholder="Start Date"
                            onChange={(date) => {
                              updateRule(index, {
                                startDate: date
                              });
                            }}
                            showMonthDropdown
                            showYearDropdown
                          />
                          <DatePickerField
                            name={`rule_${rule.id}_category_rule_end_date`}
                            control={control}
                            placeholder="End Date"
                            minDate={
                              control._formValues[
                                `rule_${rule.id}_category_rule_start_date`
                              ]
                            }
                            onChange={(date) => {
                              updateRule(index, {
                                endDate: date
                              });
                            }}
                            showMonthDropdown
                            showYearDropdown
                          />
                        </div>
                        <div className="w-40">
                          <SelectBox
                            options={operatorOptions}
                            value={rule.operator}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>
                            ) => {
                              updateRule(index, { operator: e.target.value });
                            }}
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                        <div
                          className={`w-44 grid ${rule.operator === "between" ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}
                        >
                          <input
                            type="number"
                            className="flex-1 px-3 py-2 border rounded"
                            value={rule.value1}
                            onChange={(e) =>
                              updateRule(index, {
                                value1: Number(e.target.value)
                              })
                            }
                          />
                          {rule.operator === "between" && (
                            <input
                              type="number"
                              className="flex-1 px-3 py-2 border rounded"
                              value={rule.value2 || ""}
                              onChange={(e) =>
                                updateRule(index, {
                                  value2: Number(e.target.value)
                                })
                              }
                              required={rule.operator === "between"}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <button
                className="text-green text-xs font-medium"
                type="button"
                onClick={addRule}
              >
                + Create additional rule
              </button>
              {rules.length > 0 && (
                <button
                  className="text-xs font-semibold flex items-center gap-1.5 bg-green rounded px-2 py-1.5 text-white"
                  type="button"
                  onClick={loadStores}
                >
                  <Image
                    src={whiteFilterIcon}
                    alt="Filter"
                    width={12}
                    height={11}
                  />
                  Apply Filters
                </button>
              )}
            </div>
          </div>

          {/* Store Table */}
          {showStoreList && (
            <div
              className={`overflow-x-auto max-h-[600px] overflow-y-auto ${isLoading ? "opacity-50" : ""}`}
            >
              <table className="min-w-full table-auto divide-y divide-gray-200">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-heading-very-light">
                    <th className="py-3 align-middle text-left text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          selectedStores.length === filteredStores.length
                        }
                        onChange={() => {
                          const allStoreIds = filteredStores.map(
                            (store) => store.id
                          );
                          if (selectedStores.length === filteredStores.length) {
                            // Uncheck all: clear selectedStores and add all to excludedStores
                            setSelectedStores([]);
                            setExcludedStores(allStoreIds);
                            setValue("selected_stores", []);
                            setValue("excluded_stores", allStoreIds);
                          } else {
                            // Check all: add all to selectedStores and clear excludedStores
                            setSelectedStores(allStoreIds);
                            setExcludedStores([]);
                            setValue("selected_stores", allStoreIds);
                            setValue("excluded_stores", []);
                          }
                        }}
                        className="rounded cursor-pointer border-gray-300 text-green focus:ring-green mt-1"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">
                      Store
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">
                      Chain
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">
                      Volume
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">
                      SKUs
                    </th>
                    {isManufacturerAccount && (
                      <th className="px-3 py-3 text-left text-xs font-semibold">
                        Distributor
                      </th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-semibold">
                      Sales Rep
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStores.map((store) => (
                    <tr
                      key={store.id}
                      className="text-sm text-filter-light font-medium"
                    >
                      <td className="">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store.id)}
                          onChange={() => {
                            if (selectedStores.includes(store.id)) {
                              // Uncheck: remove from selectedStores and add to excludedStores
                              const newSelectedStores = selectedStores.filter(
                                (id) => id !== store.id
                              );
                              const newExcludedStores = excludedStores.includes(
                                store.id
                              )
                                ? excludedStores
                                : [...excludedStores, store.id];
                              setSelectedStores(newSelectedStores);
                              setExcludedStores(newExcludedStores);
                              setValue("selected_stores", newSelectedStores);
                              setValue("excluded_stores", newExcludedStores);
                            } else {
                              // Check: add to selectedStores and remove from excludedStores
                              const newSelectedStores = [
                                ...selectedStores,
                                store.id
                              ];
                              const newExcludedStores = excludedStores.filter(
                                (id) => id !== store.id
                              );
                              setSelectedStores(newSelectedStores);
                              setExcludedStores(newExcludedStores);
                              setValue("selected_stores", newSelectedStores);
                              setValue("excluded_stores", newExcludedStores);
                            }
                          }}
                          className="rounded cursor-pointer border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-4">{store.name}</td>
                      <td className="px-3 py-4">{store.chain}</td>
                      <td className="px-3 py-4">
                        ${formatNumber(Number(store.volume || 0), false, 1)}
                      </td>
                      <td className="px-3 py-4">{formatNumber(store.skus)}</td>
                      {isManufacturerAccount && (
                        <td className="px-3 py-4">{store.distributor}</td>
                      )}
                      <td className="px-3 py-4">{store.sales_rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t gap-3 text-xs font-medium">
            <div className="buttons flex items-center gap-3">
              <button
                disabled={isLoading}
                type="button"
                onClick={() => setShowStoreList(!showStoreList)}
                className="text-green border-green border rounded px-3 py-2.5 hover:opacity-75 disabled:opacity-50"
              >
                {showStoreList ? "Hide" : "See"} All Stores (
                {formatNumber(filteredStores.length)})
              </button>
              <button
                disabled={selectedStores.length === 0 || isLoading}
                type="button"
                onClick={handleSave}
                className="px-3 py-2.5 min-w-24 border bg-green rounded text-white disabled:opacity-50"
              >
                Selected Sales Reps ({formatNumber(selectedSalesReps.length)})
              </button>
            </div>

            {selectedStores.length > 0 && (
              <span className="text-highlighted-color font-medium text-xs">
                <strong>{formatNumber(selectedStores.length)}</strong> Stores
                Selected
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesRepSelectionModal;
