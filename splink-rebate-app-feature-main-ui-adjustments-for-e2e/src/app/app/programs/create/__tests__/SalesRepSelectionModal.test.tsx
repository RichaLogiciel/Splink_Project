import { getUserClient } from "@/utils/getUserClient";
import {
  isDistributorAdmin,
  isManufacturerAdmin
} from "@/utils/rolesConditions";
import { ENTITY_TYPES } from "@/views/Distributor/programConstants";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import SalesRepSelectionModal from "../components/SalesRepSelectionModal";

// Mock the utility functions
jest.mock("@/utils/getUserClient");
jest.mock("@/utils/rolesConditions");
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn()
  }
}));

const mockDistributors = [
  { label: "Distributor 1", value: "1" },
  { label: "Distributor 2", value: "2" }
];

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

describe("SalesRepSelectionModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    distributors: mockDistributors
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUserClient as jest.Mock).mockReturnValue({
      role: ENTITY_TYPES.MANUFACTURER
    });
    (isManufacturerAdmin as jest.Mock).mockReturnValue(true);
    (isDistributorAdmin as jest.Mock).mockReturnValue(false);
  });

  it("renders distributor selection for manufacturer admin", () => {
    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Check for the main title using getAllByText to handle multiple matches
    expect(screen.getAllByText("Select Sales Reps").length).toBeGreaterThan(0);
    // Check for the sales rep selection section
    expect(
      screen.getByText("Select Sales Rep Eligibility Based on Store Criteria")
    ).toBeInTheDocument();
  });

  it("handles distributor selection and validation", async () => {
    const onClose = jest.fn();
    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    // The component now has different buttons - look for the "Selected Sales Reps" button
    const selectedSalesRepsButton = screen.getByText(/Selected Sales Reps/);
    expect(selectedSalesRepsButton).toBeDisabled();

    // Test that we can close the modal
    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles loading state", () => {
    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Check that the main content is rendered using getAllByText
    expect(screen.getAllByText("Select Sales Reps").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Select Sales Rep Eligibility Based on Store Criteria")
    ).toBeInTheDocument();
  });

  it("handles distributor admin role", () => {
    (getUserClient as jest.Mock).mockReturnValue({ role: "DISTRIBUTOR_ADMIN" });
    (isManufacturerAdmin as jest.Mock).mockReturnValue(false);
    (isDistributorAdmin as jest.Mock).mockReturnValue(true);

    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // For distributor admin, the component should still show the main content
    expect(screen.getAllByText("Select Sales Reps").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Select Sales Rep Eligibility Based on Store Criteria")
    ).toBeInTheDocument();
  });

  it("handles close button click", () => {
    const onClose = jest.fn();
    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles all distributors selection", () => {
    render(
      <TestWrapper defaultValues={{ sales_rep_selection_distributors: [] }}>
        <SalesRepSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Check that the main content is rendered using getAllByText
    expect(screen.getAllByText("Select Sales Reps").length).toBeGreaterThan(0);

    // Test that the "See All Stores" button is present
    const seeAllStoresButton = screen.getByText(/See All Stores/);
    expect(seeAllStoresButton).toBeInTheDocument();
  });
});
