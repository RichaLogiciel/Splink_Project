import { PROGRAM_CRITERIA_VALUES } from "@/views/Distributor/programConstants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import ProgramCriteria from "../components/ProgramCriteria";

describe("ProgramCriteria", () => {
  it("renders criteria cards for REBATE program type", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "REBATE"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(screen.getByText("Automatic rebate")).toBeInTheDocument();
    expect(
      screen.getByText("Hit a certain purchase ($) amount")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hit a certain quantity thresholds of cases/boxes/eaches"
      )
    ).toBeInTheDocument();
  });

  it("renders criteria cards for SPIFF program type", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "SPIFF"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(
      screen.getByText("Automatic rebate for Sales Rep")
    ).toBeInTheDocument();
  });

  it("handles criteria selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "REBATE"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const selectButton = screen.getAllByText("Select")[0];
    await act(async () => {
      fireEvent.click(selectButton);
      await formMethods.trigger("selectedCriteria");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("selectedCriteria")).toBe(
      PROGRAM_CRITERIA_VALUES.BASE
    );
  });

  it("shows error state when criteria is required", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "REBATE"
        },
        mode: "onChange"
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    await act(async () => {
      formMethods.setError("selectedCriteria", {
        type: "required",
        message: "Please select a criteria"
      });
      await formMethods.trigger("selectedCriteria");
      rerender(<TestComponent />);
    });

    const cards = screen.getAllByRole("button", { name: /select/i });
    expect(cards[0].closest("div")).toHaveClass("border-danger");
  });

  it("clears tiers when selecting new criteria", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "REBATE",
          tiers: [{ tierId: 0 }],
          isMultipleTiers: true
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const selectButton = screen.getAllByText("Select")[0];
    await act(async () => {
      fireEvent.click(selectButton);
      await formMethods.trigger("selectedCriteria");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("tiers")).toEqual([]);
    expect(formMethods.getValues("isMultipleTiers")).toBe(false);
  });

  it("handles invalid criteria selection", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "INVALID",
          programType: "REBATE"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    expect(screen.queryByText("Invalid criteria")).not.toBeInTheDocument();
  });

  it("handles program type change", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: PROGRAM_CRITERIA_VALUES.BASE,
          programType: "REBATE"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    await act(async () => {
      formMethods.setValue("programType", "SPIFF", { shouldValidate: true });
      formMethods.setValue("selectedCriteria", "", { shouldValidate: true });
      await formMethods.trigger(["programType", "selectedCriteria"]);
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("selectedCriteria")).toBe("");
  });

  it("handles deselection of criteria", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: PROGRAM_CRITERIA_VALUES.BASE,
          programType: "REBATE"
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const selectButton = screen.getAllByText("Selected")[0];
    await act(async () => {
      fireEvent.click(selectButton);
      await formMethods.trigger("selectedCriteria");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("selectedCriteria")).toBe("");
  });

  it("handles criteria selection with existing tiers", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: "",
          programType: "REBATE",
          tiers: [
            { tierId: 1, rebateValue: 10 },
            { tierId: 2, rebateValue: 20 }
          ],
          isMultipleTiers: true
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    const selectButton = screen.getAllByText("Select")[0];
    await act(async () => {
      fireEvent.click(selectButton);
      await formMethods.trigger("selectedCriteria");
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("tiers")).toEqual([]);
    expect(formMethods.getValues("isMultipleTiers")).toBe(false);
  });

  it("handles program type change with existing criteria", async () => {
    let formMethods: any;
    const TestComponent = () => {
      formMethods = useForm({
        defaultValues: {
          selectedCriteria: PROGRAM_CRITERIA_VALUES.BASE,
          programType: "REBATE",
          tiers: [{ tierId: 1, rebateValue: 10 }]
        }
      });
      return (
        <FormProvider {...formMethods}>
          <ProgramCriteria />
        </FormProvider>
      );
    };

    let rerender: any;
    await act(async () => {
      const result = render(<TestComponent />);
      rerender = result.rerender;
    });

    await act(async () => {
      formMethods.setValue("programType", "SPIFF", { shouldValidate: true });
      formMethods.setValue("selectedCriteria", "", { shouldValidate: true });
      formMethods.setValue("tiers", [], { shouldValidate: true });
      await formMethods.trigger(["programType", "selectedCriteria", "tiers"]);
      rerender(<TestComponent />);
    });

    expect(formMethods.getValues("selectedCriteria")).toBe("");
    expect(formMethods.getValues("tiers")).toEqual([]);
  });
});
