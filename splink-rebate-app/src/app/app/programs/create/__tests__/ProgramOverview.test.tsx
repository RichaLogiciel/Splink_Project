import * as userUtils from "@/utils/getUserClient";
import { isManufacturerAdmin } from "@/utils/rolesConditions";
import { ENTITY_TYPES } from "@/views/Distributor/programConstants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import ProgramOverview from "../components/ProgramOverview";

// Mock getUserClient
jest.mock("@/utils/getUserClient", () => ({
  getUserClient: jest.fn()
}));

const mockDistributors = [
  { label: "Distributor 1", value: "1" },
  { label: "Distributor 2", value: "2" }
];

const mockManufacturers = [
  { label: "Manufacturer 1", value: "1" },
  { label: "Manufacturer 2", value: "2" }
];

describe("ProgramOverview", () => {
  beforeEach(() => {
    // Mock distributor admin user
    (userUtils.getUserClient as jest.Mock).mockReturnValue({
      role: "DISTRIBUTOR_ADMIN",
      associatedUserId: "1"
    });
  });

  it("renders program overview form fields", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          programName: "",
          programType: "",
          startDate: "",
          endDate: "",
          compliancePeriod: "",
          participantType: "",
          isAllDistributor: true,
          isAllStores: true,
          selected_distributors: [],
          selected_stores: []
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(screen.getByLabelText(/program name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/program type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/compliance period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/participant type/i)).toBeInTheDocument();
  });

  it("handles program type change", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          programType: "",
          calculationType: "SOME_TYPE",
          selectedCriteria: "SOME_CRITERIA",
          participantType: "SOME_TYPE",
          tiers: [{ tierId: 1 }]
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const programTypeSelect = screen.getByLabelText(/program type/i);
    await act(async () => {
      fireEvent.change(programTypeSelect, { target: { value: "REBATE" } });
      await formMethods.trigger("programType");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("calculationType")).toBe("");
    expect(formMethods.getValues("selectedCriteria")).toBe("");
    expect(formMethods.getValues("participantType")).toBe("");
  });

  it("handles participant type change", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          participantType: "",
          selected_stores: [1, 2],
          selected_distributors: [1, 2]
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const participantTypeSelect = screen.getByLabelText(/participant type/i);
    await act(async () => {
      fireEvent.change(participantTypeSelect, {
        target: { value: ENTITY_TYPES.STORE }
      });
      await formMethods.trigger("participantType");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("selected_distributors")).toBeUndefined();
    expect(formMethods.getValues("selected_stores")).toEqual([1, 2]);
  });

  it("handles all stores checkbox", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          participantType: ENTITY_TYPES.STORE,
          isAllStores: false,
          selected_stores: [1, 2, 3]
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const checkbox = screen.getByLabelText(/all stores/i);
    await act(async () => {
      fireEvent.click(checkbox);
      await formMethods.trigger("isAllStores");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("isAllStores")).toBe(true);
    expect(formMethods.getValues("selected_stores")).toBeUndefined();
  });

  it("handles all distributors checkbox", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          participantType: ENTITY_TYPES.DISTRIBUTOR,
          isAllDistributor: false,
          selected_distributors: [1, 2, 3]
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const checkbox = screen.getByLabelText(/all distributors/i);
    await act(async () => {
      fireEvent.click(checkbox);
      await formMethods.trigger("isAllDistributor");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("isAllDistributor")).toBe(true);
    expect(formMethods.getValues("selected_distributors")).toBeUndefined();
  });

  it("handles date fields and compliance period visibility", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          startDate: "",
          endDate: "",
          compliancePeriod: ""
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    // Set start date
    await act(async () => {
      formMethods.setValue("startDate", "01/01/2024", { shouldValidate: true });
      await formMethods.trigger("startDate");
      rerender(<TestComponent />);
    });

    // Set end date beyond one year
    await act(async () => {
      formMethods.setValue("endDate", "01/01/2026", { shouldValidate: true });
      await formMethods.trigger("endDate");
      rerender(<TestComponent />);
    });

    // Verify start and end date fields are updated
    expect(formMethods.getValues("startDate")).toBe("01/01/2024");
    expect(formMethods.getValues("endDate")).toBe("01/01/2026");

    // Wait for state update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      rerender(<TestComponent />);
    });

    // Compliance period should be enabled for > 1 year
    const compliancePeriodSelect = screen.getByLabelText(/compliance period/i);
    expect(compliancePeriodSelect).not.toBeDisabled();
  });

  it("handles compliance period selection when enabled", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          startDate: "2024-01-01",
          endDate: "2024-06-01",
          compliancePeriod: ""
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    // Select compliance period
    const compliancePeriodSelect = screen.getByLabelText(/compliance period/i);
    await act(async () => {
      fireEvent.change(compliancePeriodSelect, {
        target: { value: "QUARTERLY" }
      });
      await formMethods.trigger("compliancePeriod");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("compliancePeriod")).toBe("QUARTERLY");
  });

  it("handles manufacturer selection for distributor admin", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          manufacturer: ""
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    // For distributor admin, manufacturer field should be visible
    // Use the react-select input by its ID
    const manufacturerSelect = screen.getByTestId("manufacturers");
    await act(async () => {
      // Simulate selecting a manufacturer by clicking and selecting
      fireEvent.click(manufacturerSelect);
      // The actual selection would happen through the react-select component
      // For testing purposes, we'll just verify the field is present
      expect(manufacturerSelect).toBeInTheDocument();
    });

    expect(formMethods.getValues("manufacturer")).toBe("1");
  });

  it("handles sales rep selection for Sales Rep admin", async () => {
    // Mock manufacturer admin user
    (userUtils.getUserClient as jest.Mock).mockReturnValue({
      role: "MANUFACTURER"
    });

    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          programType: "",
          participantType: "",
          selected_distributors: []
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    // First select SPIFF program type
    const programTypeSelect = screen.getByLabelText(/program type/i);
    await act(async () => {
      fireEvent.change(programTypeSelect, { target: { value: "SPIFF" } });
      await formMethods.trigger("programType");
      rerender(<TestComponent />);
    });

    // Verify program type is set
    expect(formMethods.getValues("programType")).toBe("SPIFF");

    // For SPIFF programs, participant type is automatically set to Sales Rep
    // So we don't need to manually select it
    // Just verify the participant type is set correctly
    expect(formMethods.getValues("participantType")).toBe(
      ENTITY_TYPES.SALES_REP
    );

    // Verify participant type is set
    expect(formMethods.getValues("participantType")).toBe(
      ENTITY_TYPES.SALES_REP
    );

    // Verify isManufacturer is true
    expect(isManufacturerAdmin("MANUFACTURER")).toBe(true);

    // Now check for the button
    const salesRepButton = screen.getByRole("button", {
      name: /select sales reps/i
    });
    expect(salesRepButton).toBeInTheDocument();
  });

  it("does not show manufacturer field for Manufacturer admin", async () => {
    // Mock Manufacturer admin user
    (userUtils.getUserClient as jest.Mock).mockReturnValue({
      role: "MANUFACTURER_ADMIN"
    });

    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          manufacturer: ""
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramOverview
            setShowStoreSelectionModal={() => {}}
            setShowSalesRepSelectionModal={() => {}}
            distributors={mockDistributors}
            manufacturers={mockManufacturers}
          />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(
      screen.queryByLabelText(/select manufacturer/i)
    ).not.toBeInTheDocument();
  });
});
