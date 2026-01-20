import {
  getCalculationTypeLabel,
  getCriteriaLabel
} from "@/utils/createProgramUtils";
import {
  ENTITY_TYPES,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import ReviewPopup from "../components/ReviewPopup";

const TestWrapper = ({
  children,
  defaultValues
}: {
  children: React.ReactNode;
  defaultValues: any;
}) => {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe("ReviewPopup", () => {
  const mockFormValues = {
    programName: "Test Program",
    programType: "REBATE",
    startDate: "01/01/2024",
    endDate: "12/31/2024",
    compliancePeriod: "MONTHLY",
    participantType: ENTITY_TYPES.STORE,
    isAllStores: true,
    selected_stores: [],
    calculationType: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT,
    selectedCriteria: PROGRAM_CRITERIA_VALUES.BASE,
    isMultipleTiers: false,
    tiers: [
      {
        min: 0,
        max: 100,
        rebateValue: 10,
        unitType: "UNIT",
        minQuantity: 0,
        maxQuantity: 100,
        programOverview: "Test Overview",
        programDescription: "Test Description"
      }
    ]
  };

  const defaultProps = {
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    formValues: mockFormValues,
    loading: false
  };

  it("renders review popup with program details", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Review Program")).toBeInTheDocument();
    expect(screen.getByText("Test Program")).toBeInTheDocument();
    expect(screen.getByText("REBATE")).toBeInTheDocument();
    expect(screen.getByText("01/01/2024 - 12/31/2024")).toBeInTheDocument();
    expect(screen.getByText("MONTHLY")).toBeInTheDocument();
    expect(screen.getByText("All Stores")).toBeInTheDocument();
  });

  it("handles submit action", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitButton);

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it("handles close action", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} />
      </TestWrapper>
    );

    const closeButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("displays calculation type and criteria", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} />
      </TestWrapper>
    );

    expect(
      screen.getByText(getCalculationTypeLabel(mockFormValues.calculationType))
    ).toBeInTheDocument();
    expect(
      screen.getByText(getCriteriaLabel(mockFormValues.selectedCriteria))
    ).toBeInTheDocument();
  });

  it("displays tier information", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("$ Amount")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("UNIT")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("disables interaction when loading", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ReviewPopup {...defaultProps} loading={true} />
      </TestWrapper>
    );

    const contentDiv = screen.getByTestId("review-content");
    expect(contentDiv).toHaveClass("opacity-50");
    expect(contentDiv).toHaveClass("pointer-events-none");

    const submitButton = screen.getByTestId("review-submit-button");
    expect(submitButton).toHaveClass("disabled:opacity-50");
    expect(submitButton).toHaveClass("disabled:pointer-events-none");

    const closeButton = screen.getByTestId("review-close-button");
    expect(closeButton).toHaveClass("disabled:opacity-50");
    expect(closeButton).toHaveClass("disabled:pointer-events-none");
  });

  it("handles multiple tiers", () => {
    const valuesWithMultipleTiers = {
      ...mockFormValues,
      isMultipleTiers: true,
      tiers: [
        {
          min: 0,
          max: 100,
          rebateValue: 10,
          unitType: "UNIT",
          minQuantity: 0,
          maxQuantity: 100,
          programOverview: "Tier 1 Overview",
          programDescription: "Tier 1 Description"
        },
        {
          min: 101,
          max: 200,
          rebateValue: 15,
          unitType: "CASE",
          minQuantity: 101,
          maxQuantity: 200,
          programOverview: "Tier 2 Overview",
          programDescription: "Tier 2 Description"
        }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithMultipleTiers}>
        <ReviewPopup {...defaultProps} formValues={valuesWithMultipleTiers} />
      </TestWrapper>
    );

    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();

    // Check tier 1 details
    expect(screen.getByText("Tier 1 Overview")).toBeInTheDocument();
    expect(screen.getByText("Tier 1 Description")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("UNIT")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    // Click on tier 2 to check its details
    fireEvent.click(screen.getByText("Tier 2"));
    expect(screen.getByText("Tier 2 Overview")).toBeInTheDocument();
    expect(screen.getByText("Tier 2 Description")).toBeInTheDocument();
    expect(screen.getByText("$15")).toBeInTheDocument();
    expect(screen.getByText("CASE")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("handles landed value calculation type", () => {
    const valuesWithFixedAmount = {
      ...mockFormValues,
      calculationType: PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE,
      tiers: [
        {
          ...mockFormValues.tiers[0],
          rebateValue: 50
        }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithFixedAmount}>
        <ReviewPopup {...defaultProps} formValues={valuesWithFixedAmount} />
      </TestWrapper>
    );

    expect(screen.getByText("Percentage")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("handles Base tier values", () => {
    const valuesWithEmptyTier = {
      ...mockFormValues,
      tiers: [
        {
          min: 0,
          max: 100,
          rebateValue: 10,
          unitType: "",
          minQuantity: "",
          maxQuantity: "",
          programOverview: "",
          programDescription: ""
        }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithEmptyTier}>
        <ReviewPopup {...defaultProps} formValues={valuesWithEmptyTier} />
      </TestWrapper>
    );

    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("handles distributor participant type", () => {
    const valuesWithDistributor = {
      ...mockFormValues,
      participantType: ENTITY_TYPES.DISTRIBUTOR,
      isAllDistributor: false,
      selected_distributors: [
        { id: 1, name: "Distributor 1" },
        { id: 2, name: "Distributor 2" }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithDistributor}>
        <ReviewPopup {...defaultProps} formValues={valuesWithDistributor} />
      </TestWrapper>
    );

    expect(screen.getByText("2 Distributors")).toBeInTheDocument();
  });
});
