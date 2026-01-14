import {
  PROGRAM_CALCULATION_TYPE,
  PROGRAM_CALCULATION_TYPE_VALUES
} from "@/views/Distributor/programConstants";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import CalculationType from "../components/CalculationType";

const TestWrapper = ({
  children,
  defaultValues = { calculationType: "", programType: "REBATE" }
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) => {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe("CalculationType", () => {
  it("renders calculation type cards for REBATE program type", () => {
    render(
      <TestWrapper>
        <CalculationType />
      </TestWrapper>
    );

    expect(
      screen.getByText(PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT)
    ).toBeInTheDocument();
    expect(
      screen.getByText(PROGRAM_CALCULATION_TYPE.FIXED_PER_ITEM)
    ).toBeInTheDocument();
    expect(
      screen.getByText(PROGRAM_CALCULATION_TYPE.LANDED_VALUE)
    ).toBeInTheDocument();
    expect(
      screen.getByText(PROGRAM_CALCULATION_TYPE.LIST_VALUE)
    ).toBeInTheDocument();
  });

  it("renders calculation type cards for SPIFF program type", () => {
    render(
      <TestWrapper
        defaultValues={{ calculationType: "", programType: "SPIFF" }}
      >
        <CalculationType />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_STORE_COMPLIANCE
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE
      )
    ).toBeInTheDocument();
  });

  it("handles calculation type selection", () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: { calculationType: "", programType: "REBATE" }
      });
      return (
        <FormProvider {...formMethods}>
          <CalculationType />
        </FormProvider>
      );
    };

    render(<TestComponent />);
    const selectButton = screen.getAllByText("Select")[0];
    fireEvent.click(selectButton);

    expect(formMethods.getValues("calculationType")).toBe(
      PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT
    );
  });

  it("shows error state when calculation type is required", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: { calculationType: "", programType: "REBATE" },
        mode: "onChange"
      });
      return (
        <FormProvider {...formMethods}>
          <CalculationType />
        </FormProvider>
      );
    };

    const { rerender } = render(<TestComponent />);

    await formMethods.trigger("calculationType");
    rerender(<TestComponent />);

    const cards = screen.getAllByRole("button", { name: /select/i });
    expect(cards[0].closest("div")?.parentElement).toHaveClass(
      "border-red-500"
    );
  });
});
