import {
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import FieldsDetail from "../components/FieldsDetail";

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

describe("FieldsDetail", () => {
  const mockFormValues = {
    programType: "REBATE",
    calculationType: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT,
    selectedCriteria: PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY,
    isMultipleTiers: false,
    tiers: [
      {
        rebateValue: 10,
        unitType: "unit",
        minQuantity: 0,
        maxQuantity: 100,
        programOverview: "Test Overview",
        programDescription: "Test Description"
      }
    ]
  };

  it("renders fields detail form", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <FieldsDetail />
      </TestWrapper>
    );

    const rebateValue = document.querySelector("#rebateValue");
    const unitType = document.querySelector("#unitType");
    const minQuantity = document.querySelector("#minQuantity");
    const maxQuantity = document.querySelector("#maxQuantity");

    expect(rebateValue).toBeInTheDocument();
    expect(unitType).toBeInTheDocument();
    expect(minQuantity).toBeInTheDocument();
    expect(maxQuantity).toBeInTheDocument();
  });

  it("handles rebate value input", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <FieldsDetail />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const rebateInput = screen.getByPlaceholderText(/rebate value/i);
    await act(async () => {
      fireEvent.change(rebateInput, { target: { value: "20" } });
      await formMethods.trigger("tiers.0.rebateValue");
      rerender(<TestComponent />);
    });

    expect(rebateInput).toHaveValue(20);
  });

  it("handles unit type selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <FieldsDetail />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const unitTypeSelect = screen.getByTestId("unitType");
    await act(async () => {
      fireEvent.change(unitTypeSelect, { target: { value: "case" } });
      await formMethods.trigger("tiers.0.unitType");
      rerender(<TestComponent />);
    });

    expect(unitTypeSelect).toHaveValue("case");
  });

  it("shows validation error for required fields", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          ...mockFormValues,
          tiers: [{ ...mockFormValues.tiers[0], rebateValue: "" }]
        },
        mode: "onChange"
      });
      return (
        <FormProvider {...formMethods}>
          <FieldsDetail />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const rebateInput = screen.getByPlaceholderText(/rebate value/i);
    await act(async () => {
      fireEvent.blur(rebateInput);
      await formMethods.trigger("tiers.0.rebateValue");
      rerender(<TestComponent />);
    });

    expect(screen.getByText(/rebate value is required/i)).toBeInTheDocument();
  });

  it("handles multiple tiers", () => {
    const multipleTiersValues = {
      ...mockFormValues,
      isMultipleTiers: true,
      tiers: [
        {
          ...mockFormValues.tiers[0],
          rebateValue: 10
        },
        {
          ...mockFormValues.tiers[0],
          rebateValue: 20
        }
      ]
    };

    render(
      <TestWrapper defaultValues={multipleTiersValues}>
        <FieldsDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/tier 1/i)).toBeInTheDocument();
    expect(screen.getByText(/tier 2/i)).toBeInTheDocument();
  });

  it("handles growth criteria", () => {
    const growthValues = {
      ...mockFormValues,
      selectedCriteria: PROGRAM_CRITERIA_VALUES.GROWTH,
      tiers: [
        {
          ...mockFormValues.tiers[0],
          targetGrowth: 10,
          rebateValue: 5
        }
      ]
    };

    render(
      <TestWrapper defaultValues={growthValues}>
        <FieldsDetail />
      </TestWrapper>
    );

    const targetGrowthInput = screen.getByTestId("targetGrowth");
    expect(targetGrowthInput).toBeInTheDocument();
    expect(targetGrowthInput).toHaveValue(10);
  });

  it("handles POD criteria", () => {
    const podValues = {
      ...mockFormValues,
      selectedCriteria: PROGRAM_CRITERIA_VALUES.POD,
      tiers: [
        {
          ...mockFormValues.tiers[0],
          podTarget: 80,
          product_tag_rows: [
            { tag: { label: "Tag 1", value: "tag1" }, qty: 100 }
          ]
        }
      ]
    };

    render(
      <TestWrapper defaultValues={podValues}>
        <FieldsDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/product tags & quantities/i)).toBeInTheDocument();
  });
});
