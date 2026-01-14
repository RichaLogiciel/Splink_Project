"use client";

import greyUpArrow from "@/assets/icons/greyUpArrow.svg";
import { calculateDateDifference } from "@/utils/dateHelper";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

// Form steps
import { apiClient } from "@/lib/axiosClient";
import {
  fetchProductTags,
  getCalculationTypeLabel,
  getCriteriaLabel,
  getParticipantType,
  getRebateCalculationType,
  getRebateType,
  getVisibilityScope
} from "@/utils/createProgramUtils";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorAdmin } from "@/utils/rolesConditions";
import {
  ENTITY_TYPES,
  ENTITY_TYPES_RESPONSE,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { toast } from "react-toastify";
import CalculationType from "./CalculationType";
import FieldsDetail from "./FieldsDetail";
import ProgramCriteria from "./ProgramCriteria";
import ProgramOverview from "./ProgramOverview";
import {
  CalculationTypeSummary,
  ProgramCriteriaSummary,
  ProgramOverviewSummary
} from "./ProgramOverviewSummary";
import ReviewPopup from "./ReviewPopup";
import SalesRepSelectionModal from "./SalesRepSelectionModal";
import StoreSelectionModal, {
  fetchFilteredStores
} from "./StoreSelectionModal";

interface FormInputs {
  programName: string;
  programType: string;
  startDate: string;
  endDate: string;
  compliancePeriod: string;
  participantType: string;
  isAllDistributor: boolean;
  isAllSalesRep: boolean;
  isAllStores: boolean;
  selectedCriteria: string;
  calculationType: string;
  selected_distributors: any[];
  store_selection_distributors: any[];
  selected_stores: number[];
  excluded_stores: number[];
  selected_sales_reps: string[];
  isMultipleTiers: boolean;
  currentStep: number;
  loading?: boolean;
  manufacturer?: number;
  manufacturers?: { label: string; value: string }[];
  store_selection_rules: any[];
  internalInitiative: string;
  tiers: Array<{
    tierId?: number;
    rebateType?: string;
    rebateValue?: string;
    unitType?: string;
    minQuantity?: string;
    maxQuantity?: string;
    minAmount?: string;
    maxAmount?: string;
    percentageOff?: string;
    programOverview?: string;
    programDescription?: string;
    lookUpStartDate?: string;
    lookUpEndDate?: string;
    product_tag_rows?: {
      tag: string;
      qty: number;
    }[];
    product?: {
      tag: string;
      qty: number;
    }[];
  }>;
}

interface CreateProgramFormProps {
  distributors?: { label: string; value: string }[];
  manufacturers?: { label: string; value: string }[];
}

const CreateProgramForm = ({
  distributors = [],
  manufacturers = []
}: CreateProgramFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFillLoading, setIsAutoFillLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [showReview, setShowReview] = useState(false);
  const [showStoreSelectionModal, setShowStoreSelectionModal] = useState(false);
  const [showSalesRepSelectionModal, setShowSalesRepSelectionModal] =
    useState(false);

  const user = getUserClient();
  const isDistributor = isDistributorAdmin(user?.role || "");
  const distributorId = isDistributor ? user?.associatedUserId : 1;

  const methods = useForm<FormInputs>({
    defaultValues: {
      currentStep: 1,
      loading: false,
      participantType: "",
      selectedCriteria: "",
      calculationType: "",
      internalInitiative: "NO",
      isAllDistributor: true,
      isAllSalesRep: false,
      isAllStores: true,
      selected_distributors: [],
      store_selection_distributors: [],
      selected_stores: [],
      excluded_stores: [],
      selected_sales_reps: [],
      store_selection_rules: [],
      tiers: [
        {
          tierId: 0,
          rebateType: "fixed",
          rebateValue: ""
        }
      ]
    },
    mode: "onChange"
  });

  const participantType = methods.watch("participantType");
  const programType = methods.watch("programType");
  const startDate = methods.watch("startDate");
  const endDate = methods.watch("endDate");

  let hideCompliancePeriod = false;
  if (startDate && endDate) {
    const daysDifference = calculateDateDifference(startDate, endDate);
    hideCompliancePeriod = daysDifference > 364;
  }

  const getFirstStepFields = () => {
    const isAllStores = methods.getValues("isAllStores");
    const isAllDistributor = methods.getValues("isAllDistributor");
    const isAllSalesRep = methods.getValues("isAllSalesRep");

    const fields = [
      "programName",
      "programType",
      "startDate",
      "endDate",
      "participantType"
    ] as const;
    let validationFields = !hideCompliancePeriod
      ? [...fields, "compliancePeriod" as const]
      : fields;

    if (participantType === ENTITY_TYPES.STORE && !isAllStores) {
      validationFields = [...validationFields, "selected_stores" as any];
    }

    if (participantType === ENTITY_TYPES.SALES_REP) {
      validationFields = [...validationFields, "selected_stores" as any];
      validationFields = [...validationFields, "selected_sales_reps" as any];
    }

    if (
      (participantType === ENTITY_TYPES.DISTRIBUTOR && !isAllDistributor) ||
      (participantType === ENTITY_TYPES.SALES_REP && !isAllSalesRep)
    ) {
      validationFields = [...validationFields, "selected_distributors" as any];
    }

    if (isDistributor) {
      validationFields = [...validationFields, "manufacturer" as any];
    }

    return validationFields;
  };

  const watchedFields = methods.watch(getFirstStepFields());

  const isFirstStepValid = watchedFields.every(Boolean);
  const isSecondStepValid = methods.watch("selectedCriteria");
  const isThirdStepValid = methods.watch("calculationType");

  const searchParams = useSearchParams();
  const referenceId = searchParams.get("referenceId");

  const isProgramTypeSPIFF = programType == "SPIFF";
  const isProgramTypeNA = programType == "NA";

  const onSubmit = async (data: FormInputs) => {
    if (expandedStep != 4) {
      toggleStep(4);
    }
    const salesReps = data.selected_sales_reps;

    // Validate Criteria is selected
    if (data.selectedCriteria == "") {
      toast.error("Criteria is required");
      methods.setError("selectedCriteria", {
        type: "required",
        message: "Criteria is required"
      });
      return;
    }

    // Validate calculation type is selected
    if (data.calculationType == "" && !isProgramTypeNA) {
      toast.error("Calculation type is required");
      methods.setError("calculationType", {
        type: "required",
        message: "Calculation type is required"
      });
      return;
    }

    // Validate tiers data exists
    if (!data.tiers || data.tiers.length === 0) {
      toast.error("At least one tier is required");
      methods.setError("tiers", {
        type: "required",
        message: "At least one tier is required"
      });
      return;
    }

    if (
      data.participantType == ENTITY_TYPES.SALES_REP &&
      salesReps.length == 0
    ) {
      toast.error("Please select at least one sales rep");
      // methods.setError("selected_sales_reps", {
      //   type: "required",
      //   message: "Please select at least one sales rep"
      // });
      return;
    }

    let errorFlag = false;
    // Trigger validation for tier fields
    for (let i = 0; i < data.tiers.length; i++) {
      // Trigger rebate value validation for all tiers
      const rebateValue = methods.watch(`tiers.${i}.rebateValue`);
      if (rebateValue == "" && !isProgramTypeNA) {
        methods.setError(`tiers.${i}.rebateValue`, {
          type: "required",
          message: "Rebate value is required"
        });
        toast.error(`Rebate value in tier ${i + 1} is required`);
        errorFlag = true;
      }
    }
    if (errorFlag) return;

    // Set selected_distributors for both SALES_REP and STORE programs
    if (data.participantType == ENTITY_TYPES.SALES_REP && data.isAllSalesRep) {
      methods.setValue(
        "selected_distributors",
        isDistributor
          ? [user?.associatedUserId]
          : [...distributors.map((distributor) => parseInt(distributor.value))]
      );
    }

    // For STORE and SALES_REP programs, also set selected_distributors
    if (
      data.participantType == ENTITY_TYPES.STORE ||
      data.participantType == ENTITY_TYPES.SALES_REP
    ) {
      // If store_selection_distributors is set (from StoreSelectionModal or SalesRepSelectionModal), use it
      // Otherwise, use the default logic
      const storeSelectionDistributors = data.store_selection_distributors;
      if (storeSelectionDistributors && storeSelectionDistributors.length > 0) {
        methods.setValue(
          "selected_distributors",
          storeSelectionDistributors.map((d: any) => parseInt(d.value || d))
        );
      } else {
        methods.setValue(
          "selected_distributors",
          isDistributor
            ? [user?.associatedUserId]
            : [
                ...distributors.map((distributor) =>
                  parseInt(distributor.value)
                )
              ]
        );
      }
    }

    if (Object.keys(methods.formState.errors).length > 0) {
      const errorMessages = Object.entries(methods.formState.errors)
        .map(([field, error]) => error?.message)
        .filter(Boolean)
        .join(", ");

      toast.error(errorMessages || "Please fill all required fields", {
        autoClose: 5000
      });
      return;
    } else {
      setShowReview(true);
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    const programData = methods.getValues();

    const rebateType = getRebateType(programData.calculationType);

    // Send POST request to create program
    try {
      const payload = {
        name: programData.programName,
        start_date: programData.startDate,
        end_date: programData.endDate,
        program_type: programData.programType,
        program_header: programData.programName,
        payment_term: programData.compliancePeriod,
        participant_type: getParticipantType(programData.participantType),
        target_audience: getParticipantType(programData.participantType),
        visibility_scope: getVisibilityScope(
          programData.participantType,
          programData.isAllStores,
          programData.isAllDistributor,
          programData.isAllSalesRep
        ),
        internal_initiative:
          programData?.internalInitiative === "YES" ? true : false,
        approval_status: "PENDING",
        program_details: []
      } as any;

      switch (programData.selectedCriteria) {
        case PROGRAM_CRITERIA_VALUES.BASE:
        case PROGRAM_CRITERIA_VALUES.BASE_SPIFF:
        case PROGRAM_CRITERIA_VALUES.VOID_FILL:
          payload.program_details = programData.tiers.map((tier, index) => {
            const rebateValue = parseFloat(tier.rebateValue || "0");
            const productTags = tier.product_tag_rows
              ?.map((product_tag: any) => product_tag.tag?.value)
              ?.join(", ");
            const productTagQty = tier.product_tag_rows
              ?.map((product_tag: any) => product_tag.qty)
              ?.join(", ");

            // Lookup dates for Void Fill
            let daysCriteria = 0;
            if (
              PROGRAM_CRITERIA_VALUES.VOID_FILL == programData.selectedCriteria
            ) {
              daysCriteria = calculateDateDifference(
                tier.lookUpStartDate || "",
                tier.lookUpEndDate || ""
              );

              // For Void Fill, set the calculation type to the default value as POD
              programData.calculationType =
                PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE;
            }

            return {
              tier: !programData.isMultipleTiers ? 0 : index + 1,
              criteria: programData.selectedCriteria,

              ...(rebateType === "fixed" || rebateType === "percentage"
                ? { rebate_amount: rebateValue }
                : { rebate_percentage: rebateValue }),
              program_line: programData.programName,
              program_type: programData.programType,

              description: tier.programDescription,
              overview: tier.programOverview,

              rebate_type: rebateType,
              rebate_calculation: programData.calculationType,
              rebate_calculation_type: getRebateCalculationType(
                programData.calculationType
              ),

              quantity_type: tier.unitType || null,
              min_qty: tier.minQuantity || 0,
              max_qty: tier.maxQuantity || null,

              products_tags: productTags || null,
              products_tags_qty: productTagQty || null,
              products_tags_qty_max: null,

              products: tier.product?.map((product: any) => product?.value),
              days_criteria: daysCriteria
            };
          });
          break;
        case PROGRAM_CRITERIA_VALUES.PURCHASE_VALUE:
          payload.program_details = programData.tiers.map((tier, index) => {
            const rebateValue = parseFloat(tier.rebateValue || "0");

            return {
              tier: !programData.isMultipleTiers ? 0 : index + 1,
              criteria: programData.selectedCriteria,
              min_spend: tier.minAmount,
              rebate_type: rebateType,
              ...(rebateType === "fixed" || rebateType === "percentage"
                ? { rebate_amount: rebateValue }
                : { rebate_percentage: rebateValue }),
              program_line: programData.programName,
              program_type: programData.programType,
              description: tier.programDescription,
              overview: tier.programOverview,
              rebate_calculation: programData.calculationType,
              rebate_calculation_type: getRebateCalculationType(
                programData.calculationType
              ),
              min_qty: 0
            };
          });
          break;
        case PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY:
          payload.program_details = programData.tiers.map((tier, index) => {
            const rebateValue = parseFloat(tier.rebateValue || "0");

            return {
              tier: !programData.isMultipleTiers ? 0 : index + 1,
              criteria: programData.selectedCriteria,
              quantity_type: tier.unitType,
              min_qty: tier.minQuantity,
              max_qty: tier.maxQuantity,
              rebate_type: rebateType,
              ...(rebateType === "fixed" || rebateType === "percentage"
                ? { rebate_amount: rebateValue }
                : { rebate_percentage: rebateValue }),
              program_line: programData.programName,
              program_type: programData.programType,
              description: tier.programDescription,
              overview: tier.programOverview,
              rebate_calculation: programData.calculationType,
              rebate_calculation_type: getRebateCalculationType(
                programData.calculationType
              )
            };
          });
          break;
        case PROGRAM_CRITERIA_VALUES.CATEGORY_SKUS:
        case PROGRAM_CRITERIA_VALUES.GROWTH:
        case PROGRAM_CRITERIA_VALUES.POD:
          payload.program_details = programData.tiers.map(
            (tier: any, index) => {
              const rebateValue = parseFloat(tier.rebateValue || "0");
              const podTarget = tier?.podTarget;

              return {
                tier: !programData.isMultipleTiers ? 0 : index + 1,
                criteria: programData.selectedCriteria,
                rebate_type: rebateType,
                ...(rebateType === "fixed" || rebateType === "percentage"
                  ? { rebate_amount: rebateValue }
                  : { rebate_percentage: rebateValue }),
                program_line: programData.programName,
                program_type: programData.programType,
                description: tier.programDescription,
                overview: tier.programOverview,
                rebate_calculation: programData.calculationType,
                rebate_calculation_type: getRebateCalculationType(
                  programData.calculationType
                ),
                products_tags: tier.product_tag_rows
                  ?.map((product_tag: any) => product_tag.tag?.value)
                  ?.join(", "),
                products_tags_qty: tier.product_tag_rows
                  ?.map((product_tag: any) => {
                    if (
                      programData.selectedCriteria ==
                      PROGRAM_CRITERIA_VALUES.POD
                    ) {
                      return podTarget;
                    }
                    return product_tag.qty;
                  })
                  ?.join(", "),
                products_tags_qty_max: null,
                min_qty: 0
              };
            }
          );
          break;
        case PROGRAM_CRITERIA_VALUES.PER_ITEM:
          payload.program_details = programData.tiers.map(
            (tier: any, index) => {
              const rebateValue = parseFloat(tier.rebateValue || "0");

              return {
                tier: !programData.isMultipleTiers ? 0 : index + 1,
                criteria: programData.selectedCriteria,
                rebate_type: rebateType,
                ...(rebateType === "fixed" || rebateType === "percentage"
                  ? { rebate_amount: rebateValue }
                  : { rebate_percentage: rebateValue }),
                program_line: programData.programName,
                program_type: programData.programType,
                description: tier.programDescription,
                overview: tier.programOverview,
                rebate_calculation: programData.calculationType,
                rebate_calculation_type: getRebateCalculationType(
                  programData.calculationType
                ),
                quantity_type: tier.unitType,
                points_per_sku: tier.valuePerItem,
                products_tags: tier.product_tag_rows
                  ?.map((product_tag: any) => product_tag.tag?.value)
                  ?.join(", "),
                products_tags_qty: tier.product_tag_rows
                  ?.map((product_tag: any) => product_tag.qty)
                  ?.join(", "),
                products_tags_qty_max: null,
                min_qty: 0
              };
            }
          );
          break;
      }

      if (
        programData.participantType == ENTITY_TYPES.DISTRIBUTOR &&
        programData.isAllDistributor == false
      ) {
        payload.visibility_entities = programData?.selected_distributors?.map(
          (distributor: any) => ({
            entity_type: ENTITY_TYPES_RESPONSE.DISTRIBUTOR,
            entity_id: distributor?.value || distributor
          })
        );
      }

      if (programData.participantType == ENTITY_TYPES.SALES_REP) {
        payload.visibility_entities = programData?.selected_sales_reps?.map(
          (salesRep: any) => ({
            entity_type: ENTITY_TYPES_RESPONSE.SALES_REP,
            entity_id: salesRep?.value || salesRep
          })
        );

        // Use store_criteria for SPIFF stores to avoid "object too large" error
        payload.store_criteria = {
          rules: programData?.store_selection_rules || []
        };
        payload.distributor_ids = programData.selected_distributors || [];
        payload.excluded_stores = programData?.excluded_stores || [];
        payload.manufacturer_id = isDistributor
          ? programData.manufacturer
          : user?.associatedUserId;
      }

      if (
        programData.participantType == ENTITY_TYPES.STORE &&
        programData.isAllStores == false
      ) {
        // Current logic is to exclude stores from the program
        // payload.visibility_entities = programData?.selected_stores?.map(
        //   (store: any) => ({
        //     entity_type: ENTITY_TYPES_RESPONSE.STORE,
        //     entity_id: store
        //   })
        // );
        payload.store_criteria = {
          rules: programData?.store_selection_rules || []
        };
        payload.distributor_ids = programData.selected_distributors || [];
        payload.excluded_stores = programData?.excluded_stores || [];
        payload.manufacturer_id = isDistributor
          ? programData.manufacturer
          : user?.associatedUserId;
      }

      // Add Manufacturer ID if distributor
      if (isDistributor) {
        payload.manufacturer_id = programData.manufacturer;
      }

      // console.log("payload", payload); // TODO: For testing purposes
      // if (1 == 1) return; // TODO: For testing purposes
      const response = await apiClient.post(
        "/programs/create-program",
        payload
      );
      const { status, data } = response;
      if (status == ("success" as any)) {
        toast.success("Program created successfully");

        setShowReview(false);
        methods.reset();
        setExpandedStep(1);
      } else {
        toast.error(data || "Error creating program");
      }
    } catch (error: any) {
      toast.error(error?.data || "Error creating program");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const toggleStep = async (step: number) => {
    if (step == (expandedStep || 1)) return;
    // Allow going back to previous steps without validation
    if (step < (expandedStep || 0)) {
      setExpandedStep(step);
      return;
    } else {
      if (step > 1) {
        if (!isFirstStepValid) {
          toast.error("Please complete the current step before proceeding");
          return;
        }
      }
      // Trigger validation for all fields in the current step
      await methods.trigger();
    }

    // Check if current step is valid before proceeding to next step
    const currentStep = expandedStep || 1;
    let validationFields: (keyof FormInputs)[] = [];

    // Define fields to validate for each step
    switch (currentStep) {
      case 1:
        validationFields = [...getFirstStepFields()];
        break;
      case 2:
        validationFields = ["selectedCriteria"];
        break;
      case 3:
        validationFields = ["calculationType"];
        break;
      case 4:
        validationFields = ["tiers"];
        break;
    }

    // Validate only current step fields
    const isValid = validationFields.every(
      (field) => !methods.formState.errors[field]
    );

    if (isValid) {
      setExpandedStep(step);
    } else {
      toast.error("Please complete the current step before proceeding");
    }
  };

  const handleFirstStepNext = async () => {
    const validationFields = getFirstStepFields();

    const isValid = await methods.trigger(validationFields as any);
    if (isValid) {
      toggleStep(isProgramTypeSPIFF ? 3 : 2);
    } else {
      const errorMessages = Object.entries(methods.formState.errors)
        .map(([field, error]) => error?.message)
        .filter(Boolean)
        .join(", ");

      toast.error(errorMessages || "Please fill all required fields", {
        autoClose: 5000
      });
    }
  };

  useEffect(() => {
    methods.setValue("loading", isLoading);
  }, [isLoading]);

  // Get Program Details from Reference ID
  useEffect(() => {
    const fetchProgramDetails = async () => {
      if (referenceId) {
        setIsAutoFillLoading(true);
        try {
          const apiData = await apiClient.get(
            `/programs/get-program/?program_id=${referenceId}`
          );

          const { status, data } = apiData;
          if (status == ("success" as any)) {
            // Progra Overview
            const manufacturerTags = await fetchProductTags(
              data?.Manufacturer?.id
            );

            const selectedProductRuleTag = manufacturerTags.find(
              (tag: any) => tag.value == data?.ProgramDetails?.[0]?.productsTags
            );

            const programCriteria = getCriteriaLabel(
              data?.ProgramDetails?.[0]?.criteria ==
                PROGRAM_CRITERIA_VALUES.OUTREACH
                ? PROGRAM_CRITERIA.CATEGORY_SKUS
                : data?.ProgramDetails?.[0]?.criteria
            );
            const calculationType = getCalculationTypeLabel(
              data?.ProgramDetails?.[0]?.rebateCalculation || ""
            );

            // Find the matching manufacturer object from the manufacturers array
            const manufacturerMatch = manufacturers.find(
              (manufacturer) =>
                manufacturer.value == data?.Manufacturer?.id?.toString()
            );

            methods.setValue(
              "programName",
              `${manufacturerMatch?.label} Internal Initiative`
            );

            methods.setValue("programType", "NA");
            if (manufacturerMatch) {
              methods.setValue(
                "manufacturer",
                Number(manufacturerMatch.value),
                {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true
                }
              );
              methods.setValue("manufacturers", [manufacturerMatch], {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
            }

            methods.setValue("startDate", Date());
            methods.setValue("endDate", data?.endDate);
            methods.setValue("compliancePeriod", data?.paymentTerm);

            methods.setValue(
              "internalInitiative",
              "YES"
              // data?.internalInitiative ? "YES" : "NO"
            );
            methods.setValue("participantType", ENTITY_TYPES.SALES_REP);

            methods.setValue("isAllDistributor", false);
            methods.setValue("isAllSalesRep", false);
            methods.setValue("isAllStores", false);

            // Rules Selection
            const ruleId = Date.now().toString();
            const rulesSelection = [
              {
                id: ruleId,
                type: "category",
                category: selectedProductRuleTag,
                operator: "<",
                value1:
                  data.manufacturerId == 136 &&
                  data?.ProgramDetails?.[0]?.criteria ==
                    PROGRAM_CRITERIA_VALUES.POD // Temporary fix for POD Criteria
                    ? 1
                    : data?.ProgramDetails?.[0]?.productsTagsQty,
                startDate: null,
                endDate: null
              }
            ];

            methods.setValue("selected_distributors", [distributorId]);

            methods.setValue("store_selection_rules", rulesSelection);
            const filteredStores = await fetchFilteredStores({
              rules: rulesSelection,
              manufacturerId: data?.Manufacturer?.id,
              distributors: [distributorId?.toString() || ""]
            });

            const selectedSalesReps = Array.from(
              new Set(
                filteredStores
                  .map((store: any) => {
                    if (store.sales_rep_id?.includes(",")) {
                      return store.sales_rep_id
                        ?.split(",")
                        .map((id: any) => id.trim());
                    }
                    return [store.sales_rep_id];
                  })
                  .flat()
                  .filter((id: any) => id != null)
              )
            );

            methods.setValue("selected_sales_reps", selectedSalesReps);

            if (filteredStores.length > 0) {
              methods.setValue(
                "selected_stores",
                filteredStores.map((store) => store.id)
              );
            }

            // Program Criteria
            methods.setValue("selectedCriteria", programCriteria);

            // Calculation Type
            methods.setValue("calculationType", calculationType);

            // Tiers/Fields Details
            const tiers = data?.ProgramDetails?.map((tier: any) => ({
              product_tag_rows: [
                {
                  tag: {
                    label:
                      manufacturerTags.find(
                        (tag: any) => tag.value == tier.productsTags
                      )?.label || "",
                    value: tier.productsTags
                  },
                  qty: tier.productsTagsQty
                }
              ]
            }));

            methods.setValue("tiers", tiers);
            methods.setValue(
              "isMultipleTiers",
              data?.ProgramDetails?.length > 1
            );

            await methods.trigger();
          } else {
            throw new Error(data || "Error fetching program");
          }
        } catch (error: any) {
          console.error("error", error);
          toast.error(error?.message || "Error fetching program");
        } finally {
          setIsAutoFillLoading(false);
        }
      }
    };
    fetchProgramDetails();
  }, [referenceId, searchParams]);

  return (
    <div
      className={`createNewProgram pr-2 ${isAutoFillLoading ? "opacity-50 pointer-events-none select-none" : ""}`}
    >
      <h2 className="text-lg font-semibold mb-6">Create Program</h2>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="relative">
          <div
            className={
              showStoreSelectionModal || showSalesRepSelectionModal
                ? "hidden"
                : "space-y-4"
            }
          >
            <div className="space-y-4">
              {/* Step 1: Program Overview */}
              <div className="flex">
                <div className="flex-none w-16 relative">
                  <div
                    className={`absolute top-4 left-4 w-8 h-8 rounded-md flex items-center justify-center font-medium text-sm 
                    border-green border ${expandedStep === 1 ? "bg-green text-white" : " text-green opacity-50"}`}
                  >
                    1
                  </div>
                </div>
                <div className="flex-grow">
                  <div className={`bg-white rounded-lg`}>
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer`}
                      onClick={() => toggleStep(1)}
                    >
                      <div className="label leading-none">
                        <span className="text-xs text-highlighted-color opacity-70 uppercase">
                          Step 1
                        </span>
                        <h2 className="text-green font-medium mt-1">
                          Program Overview
                        </h2>
                        {expandedStep !== 1 && <ProgramOverviewSummary />}
                      </div>
                      <span
                        className={`transform transition-transform ${expandedStep === 1 ? "rotate-180" : ""}`}
                      >
                        <Image
                          src={greyUpArrow}
                          width="12"
                          height="8"
                          alt="Accordion Arrow"
                        />
                      </span>
                    </div>
                    {expandedStep === 1 && (
                      <div className="p-4 pt-0">
                        <ProgramOverview
                          setShowSalesRepSelectionModal={
                            setShowSalesRepSelectionModal
                          }
                          distributors={distributors}
                          manufacturers={manufacturers}
                          setShowStoreSelectionModal={
                            setShowStoreSelectionModal
                          }
                        />

                        <div className="flex justify-end mt-6">
                          <button
                            disabled={!isFirstStepValid}
                            type="button"
                            className="bg-green text-white px-4 py-2 text-sm font-medium rounded min-w-24 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleFirstStepNext}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Program Criteria */}
              {!isProgramTypeSPIFF ? (
                <div id="ProgramCriteriaStep" className="flex select-none">
                  <div className="flex-none w-16 relative">
                    <div
                      className={`absolute top-4 left-4 w-8 h-8 rounded-md flex items-center justify-center font-medium text-sm 
                    border-green border ${expandedStep == 2 ? "bg-green text-white" : " text-green"} ${
                      !isFirstStepValid || expandedStep != 2 ? "opacity-50" : ""
                    }`}
                    >
                      2
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div
                      className={`bg-white rounded-lg ${
                        !isFirstStepValid && expandedStep != 2
                          ? "opacity-70"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center p-4 cursor-pointer`}
                        onClick={() => toggleStep(2)}
                      >
                        <div className="label leading-none">
                          <span className="text-xs text-highlighted-color opacity-70 uppercase">
                            Step 2
                          </span>
                          <h2
                            className={`${
                              !isFirstStepValid && expandedStep != 2
                                ? "text-black opacity-70"
                                : "text-green"
                            } font-medium mt-1`}
                          >
                            Select Program Criteria
                          </h2>
                          {expandedStep !== 2 &&
                            methods.watch("selectedCriteria") && (
                              <ProgramCriteriaSummary
                                criteria={methods.watch("selectedCriteria")}
                              />
                            )}
                        </div>
                        <span
                          className={`transform transition-transform ${expandedStep === 2 ? "rotate-180" : ""}`}
                        >
                          <Image
                            src={greyUpArrow}
                            width="12"
                            height="8"
                            alt="Accordion Arrow"
                          />
                        </span>
                      </div>
                      {expandedStep === 2 && (
                        <div className="p-4 pt-1">
                          <ProgramCriteria />

                          <div className="flex justify-end mt-6 items-center">
                            {methods.formState.errors.selectedCriteria && (
                              <p className="text-red-500 text-sm mr-4">
                                Please select a criteria to continue
                              </p>
                            )}
                            <button
                              type="button"
                              className={`bg-green text-white px-4 py-2 text-sm font-medium rounded min-w-24 ${
                                methods.formState.errors.selectedCriteria &&
                                "opacity-50"
                              }`}
                              disabled={
                                !!methods.formState.errors.selectedCriteria
                              }
                              onClick={async () => {
                                const selectedCriteria =
                                  methods.getValues("selectedCriteria");
                                const isValid = await methods.trigger(
                                  "selectedCriteria",
                                  {
                                    shouldFocus: true
                                  }
                                );

                                if (isValid && selectedCriteria) {
                                  toggleStep(isProgramTypeNA ? 4 : 3);
                                } else {
                                  toast.error(
                                    "Please select a criteria to continue"
                                  );
                                  document
                                    .getElementById("ProgramCriteriaStep")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 3: Select Calculation Type */}
              {programType != "NA" && (
                <div id="CalculationTypeStep" className="flex select-none">
                  <div className="flex-none w-16 relative">
                    <div
                      className={`absolute top-4 left-4 w-8 h-8 rounded-md flex items-center justify-center font-medium text-sm 
                    border-green border ${expandedStep === 3 ? "bg-green text-white" : " text-green"} ${
                      !isFirstStepValid ||
                      !isSecondStepValid ||
                      expandedStep != 3
                        ? "opacity-50"
                        : ""
                    }`}
                    >
                      {isProgramTypeSPIFF ? 2 : 3}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div
                      className={`bg-white rounded-lg ${
                        (!isFirstStepValid || !isSecondStepValid) &&
                        expandedStep != 3
                          ? "opacity-70"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center p-4 cursor-pointer`}
                        onClick={() => toggleStep(3)}
                      >
                        <div className="label leading-none">
                          <span className="text-xs text-highlighted-color opacity-70 uppercase">
                            Step {isProgramTypeSPIFF ? 2 : 3}
                          </span>
                          <h2
                            className={`${
                              (!isFirstStepValid || !isSecondStepValid) &&
                              expandedStep != 3
                                ? "text-black opacity-70"
                                : "text-green"
                            } font-medium mt-1`}
                          >
                            Select Calculation Type
                          </h2>
                          {expandedStep !== 3 &&
                            methods.watch("calculationType") && (
                              <CalculationTypeSummary
                                calculationType={methods.watch(
                                  "calculationType"
                                )}
                              />
                            )}
                        </div>
                        <span
                          className={`transform transition-transform ${expandedStep === 2 ? "rotate-180" : ""}`}
                        >
                          <Image
                            src={greyUpArrow}
                            width="12"
                            height="8"
                            alt="Accordion Arrow"
                          />
                        </span>
                      </div>

                      {expandedStep === 3 && (
                        <div className="p-4 pt-1">
                          <CalculationType />
                          <div className="flex justify-end mt-6 items-center">
                            {methods.formState.errors.calculationType && (
                              <p className="text-red-500 text-sm mr-4">
                                Please select a calculation type to continue
                              </p>
                            )}
                            <button
                              type="button"
                              className={`bg-green text-white px-4 py-2 text-sm font-medium rounded min-w-24 ${
                                methods.formState.errors.calculationType &&
                                "opacity-50"
                              }`}
                              disabled={
                                !!methods.formState.errors.calculationType
                              }
                              onClick={async () => {
                                const selectedCalculationType =
                                  methods.getValues("calculationType");
                                const isValid = await methods.trigger(
                                  "calculationType",
                                  {
                                    shouldFocus: true
                                  }
                                );

                                if (isValid && selectedCalculationType) {
                                  toggleStep(4);
                                } else {
                                  document
                                    .getElementById("CalculationTypeStep")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Detail */}
              <div id="DetailsStep" className="flex select-none">
                <div className="flex-none w-16 relative">
                  <div
                    className={`absolute top-4 left-4 w-8 h-8 rounded-md flex items-center justify-center font-medium text-sm 
                    border-green border ${expandedStep === 4 ? "bg-green text-white" : " text-green"} ${
                      !isFirstStepValid ||
                      !isSecondStepValid ||
                      (!isThirdStepValid && !isProgramTypeNA) ||
                      expandedStep != 4
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    {isProgramTypeSPIFF || isProgramTypeNA ? 3 : 4}
                  </div>
                </div>
                <div className="flex-grow">
                  <div
                    className={`bg-white rounded-lg ${
                      (!isFirstStepValid ||
                        !isSecondStepValid ||
                        (!isThirdStepValid && !isProgramTypeNA)) &&
                      expandedStep != 4
                        ? "opacity-70"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer`}
                      onClick={() => toggleStep(4)}
                    >
                      <div className="label leading-none">
                        <span className="text-xs text-highlighted-color opacity-70 uppercase">
                          Step {isProgramTypeSPIFF || isProgramTypeNA ? 3 : 4}
                        </span>
                        <h2
                          className={`${
                            (!isFirstStepValid ||
                              !isSecondStepValid ||
                              (!isThirdStepValid && !isProgramTypeNA)) &&
                            expandedStep != 4
                              ? "text-black opacity-70"
                              : "text-green"
                          } font-medium mt-1`}
                        >
                          Details
                        </h2>
                      </div>
                      <span>
                        <Image
                          src={greyUpArrow}
                          width="12"
                          height="8"
                          alt="Accordion Arrow"
                        />
                      </span>
                    </div>

                    {expandedStep === 4 && (
                      <div className="p-4 pt-1">
                        <FieldsDetail />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Review & Submit Button */}
            <div className="mt-7 flex justify-center">
              <button
                type="submit"
                className={`px-4 py-2 bg-green text-white rounded-md ${
                  (!methods.formState.isValid &&
                    Object.keys(methods.formState.errors).length > 0) ||
                  isLoading
                    ? "opacity-50"
                    : ""
                }`}
                disabled={
                  !methods.formState.isValid &&
                  Object.keys(methods.formState.errors).length > 0
                }
              >
                Review & Submit
              </button>
            </div>
          </div>

          {/* <pre>{JSON.stringify(methods.formState.errors, null, 2)}</pre> */}

          {/* Store Selection Modal */}
          {showStoreSelectionModal && (
            <div
              className={`-mt-14 bg-common-bg ${
                showStoreSelectionModal ? "block" : "hidden"
              }`}
            >
              <StoreSelectionModal
                distributors={distributors}
                onClose={() => setShowStoreSelectionModal(false)}
                key="store-selection-modal"
                onStoreSelect={(stores, excludedStores) => {
                  methods.setValue("selected_stores", stores);
                  methods.setValue("excluded_stores", excludedStores);
                  setShowStoreSelectionModal(false);
                }}
              />
            </div>
          )}

          {/* Sales Rep Selection Modal */}
          {showSalesRepSelectionModal && (
            <div
              className={`-mt-14 bg-common-bg ${
                showSalesRepSelectionModal ? "block" : "hidden"
              }`}
            >
              <SalesRepSelectionModal
                distributors={distributors}
                onClose={() => setShowSalesRepSelectionModal(false)}
                key="sales-rep-selection-modal"
                onSalesRepSelect={(salesReps, excludedStores) => {
                  methods.setValue("selected_sales_reps", salesReps);
                  methods.setValue("excluded_stores", excludedStores);
                  setShowSalesRepSelectionModal(false);
                }}
              />
            </div>
          )}

          {/* Review Popup */}
          {showReview && (
            <ReviewPopup
              loading={isLoading}
              onClose={() => setShowReview(false)}
              onSubmit={handleFinalSubmit}
              formValues={methods.getValues()}
            />
          )}
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateProgramForm;
