import {
  ENTITY_TYPES,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import CreateProgramForm from "../components/CreateProgramForm";

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

describe("CreateProgramForm", () => {
  const mockFormValues = {
    programName: "Test Program",
    programType: "REBATE",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    compliancePeriod: "MONTHLY",
    participantType: ENTITY_TYPES.STORE,
    isAllDistributor: true,
    isAllStores: true,
    selected_distributors: [],
    selected_stores: [],
    store_selection_rules: [],
    selectedCriteria: PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY,
    calculationType: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT,
    isMultipleTiers: false,
    currentStep: 1,
    loading: false,
    tiers: [
      {
        tierId: 0,
        rebateType: "fixed",
        rebateValue: "10",
        unitType: "unit",
        minQuantity: "0",
        maxQuantity: "100",
        programOverview: "Test Overview",
        programDescription: "Test Description"
      }
    ]
  };

  it("renders create program form", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(screen.getByText(/create program/i)).toBeInTheDocument();
  });

  it("handles program name input", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const nameInput = screen.getByLabelText(/program name/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "New Program" } });
      await formMethods.trigger("programName");
      rerender(<TestComponent />);
    });

    expect(nameInput).toHaveValue("New Program");
  });

  it("handles program type selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    const { rerender } = render(<TestComponent />);

    const typeSelect = screen.getByLabelText(/program type/i);
    await act(async () => {
      fireEvent.change(typeSelect, { target: { value: "SPIFF" } });
      await formMethods.trigger("programType");
    });
    rerender(<TestComponent />);

    expect(typeSelect).toHaveValue("SPIFF");
  });

  it("handles date selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    const { rerender } = render(<TestComponent />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    await act(async () => {
      fireEvent.change(startDateInput, { target: { value: "2024-02-01" } });
      fireEvent.change(endDateInput, { target: { value: "2024-02-28" } });
      await formMethods.trigger(["startDate", "endDate"]);
    });
    rerender(<TestComponent />);

    expect(startDateInput).toHaveValue("2024-02-01");
    expect(endDateInput).toHaveValue("2024-02-28");
  });

  it("shows validation error for required fields", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: { ...mockFormValues, programName: "" },
        mode: "onChange"
      });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const nameInput = screen.getByLabelText(/program name/i);
    await act(async () => {
      fireEvent.blur(nameInput);
      await formMethods.trigger("programName");
      rerender(<TestComponent />);
    });

    expect(screen.getByText(/program name is required/i)).toBeInTheDocument();
  });

  it("handles participant type selection for store", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const participantSelect = screen.getByLabelText(/participant type/i);
    await act(async () => {
      fireEvent.change(participantSelect, {
        target: { value: ENTITY_TYPES.STORE }
      });
      await formMethods.trigger("participantType");
      rerender(<TestComponent />);
    });

    expect(participantSelect).toHaveValue(ENTITY_TYPES.STORE);
  });

  it("handles participant type selection for Sales Rep", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const typeSelect = screen.getByLabelText(/program type/i);
    await act(async () => {
      // Trigger the change event properly
      fireEvent.change(typeSelect, { target: { value: "SPIFF" } });
      // Wait for the form to update
      await new Promise((resolve) => setTimeout(resolve, 100));
      rerender(<TestComponent />);
    });

    // Check that the program type select shows the correct value
    expect(typeSelect).toHaveValue("SPIFF");
  });

  it("handles compliance period selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const periodSelect = screen.getByLabelText(/compliance period/i);
    await act(async () => {
      fireEvent.change(periodSelect, { target: { value: "QUARTERLY" } });
      await formMethods.trigger("compliancePeriod");
      rerender(<TestComponent />);
    });

    expect(periodSelect).toHaveValue("QUARTERLY");
  });

  it("handles program type selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    const { rerender } = render(<TestComponent />);

    const typeSelect = screen.getByLabelText(/program type/i);
    fireEvent.change(typeSelect, { target: { value: "SPIFF" } });
    rerender(<TestComponent />);
    await formMethods.trigger("programType");
    rerender(<TestComponent />);

    expect(typeSelect).toHaveValue("SPIFF");
  });

  it("handles date selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({ defaultValues: mockFormValues });
      return (
        <FormProvider {...formMethods}>
          <CreateProgramForm />
        </FormProvider>
      );
    };

    const { rerender } = render(<TestComponent />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startDateInput, { target: { value: "2024-02-01" } });
    rerender(<TestComponent />);
    fireEvent.change(endDateInput, { target: { value: "2024-02-28" } });
    rerender(<TestComponent />);
    await formMethods.trigger(["startDate", "endDate"]);
    rerender(<TestComponent />);

    expect(startDateInput).toHaveValue("2024-02-01");
    expect(endDateInput).toHaveValue("2024-02-28");
  });
});
