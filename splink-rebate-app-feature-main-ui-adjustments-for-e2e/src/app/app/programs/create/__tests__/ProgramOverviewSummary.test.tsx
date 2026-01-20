import { ENTITY_TYPES } from "@/views/Distributor/programConstants";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import ProgramOverviewSummary from "../components/ProgramOverviewSummary";

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

describe("ProgramOverviewSummary", () => {
  const mockFormValues = {
    programName: "Test Program",
    programType: "REBATE",
    startDate: "01/01/2024",
    endDate: "12/31/2024",
    compliancePeriod: "MONTHLY",
    participantType: ENTITY_TYPES.STORE,
    isAllStores: true,
    isAllDistributor: true,
    selected_stores: [],
    selected_distributors: []
  };

  it("renders program overview summary correctly", () => {
    render(
      <TestWrapper defaultValues={mockFormValues}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(screen.getByText("Test Program")).toBeInTheDocument();
    expect(screen.getByText("REBATE")).toBeInTheDocument();
    expect(screen.getByText("01/01/2024 - 12/31/2024")).toBeInTheDocument();
    expect(screen.getByText("MONTHLY")).toBeInTheDocument();
    expect(screen.getByText("All Stores")).toBeInTheDocument();
  });

  it("renders selected stores when not all stores", () => {
    const valuesWithSelectedStores = {
      ...mockFormValues,
      isAllStores: false,
      selected_stores: [
        { id: 1, name: "Store 1" },
        { id: 2, name: "Store 2" }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithSelectedStores}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        `${valuesWithSelectedStores.selected_stores.length} Stores`
      )
    ).toBeInTheDocument();
  });

  it("renders selected distributors when not all distributors", () => {
    const valuesWithSelectedDistributors = {
      ...mockFormValues,
      participantType: ENTITY_TYPES.DISTRIBUTOR,
      isAllDistributor: false,
      selected_distributors: [
        { id: 1, name: "Distributor 1" },
        { id: 2, name: "Distributor 2" }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithSelectedDistributors}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        `${valuesWithSelectedDistributors.selected_distributors.length} Distributors`
      )
    ).toBeInTheDocument();
  });

  it("renders sales rep participant type correctly", () => {
    const valuesWithSalesRep = {
      ...mockFormValues,
      participantType: ENTITY_TYPES.SALES_REP,
      selected_distributors: [
        { id: 1, name: "Sales Rep 1" },
        { id: 2, name: "Sales Rep 2" }
      ]
    };

    render(
      <TestWrapper defaultValues={valuesWithSalesRep}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        `${valuesWithSalesRep.selected_distributors.length} Distributor Selected`
      )
    ).toBeInTheDocument();
  });

  it("handles empty dates", () => {
    const valuesWithEmptyDates = {
      ...mockFormValues,
      startDate: "",
      endDate: ""
    };

    render(
      <TestWrapper defaultValues={valuesWithEmptyDates}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(screen.queryByText("Duration:")).not.toBeInTheDocument();
    expect(screen.queryByText(" - ")).not.toBeInTheDocument();
  });

  it("handles missing compliance period", () => {
    const valuesWithoutCompliance = {
      ...mockFormValues,
      compliancePeriod: ""
    };

    render(
      <TestWrapper defaultValues={valuesWithoutCompliance}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(screen.queryByText("Compliance Period:")).not.toBeInTheDocument();
  });

  it("handles empty participant selection", () => {
    const valuesWithEmptyParticipants = {
      ...mockFormValues,
      participantType: "",
      isAllStores: false,
      isAllDistributor: false,
      selected_stores: [],
      selected_distributors: []
    };

    render(
      <TestWrapper defaultValues={valuesWithEmptyParticipants}>
        <ProgramOverviewSummary />
      </TestWrapper>
    );

    expect(screen.queryByText("Participant:")).not.toBeInTheDocument();
  });
});
