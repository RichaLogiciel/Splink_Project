import { apiClient } from "@/lib/axiosClient";
import { getUserClient } from "@/utils/getUserClient";
import {
  isDistributorAdmin,
  isManufacturerAdmin
} from "@/utils/rolesConditions";
import { ENTITY_TYPES } from "@/views/Distributor/programConstants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import StoreSelectionModal from "../components/StoreSelectionModal";

// Mock the utility functions
jest.mock("@/utils/getUserClient");
jest.mock("@/utils/rolesConditions");
jest.mock("@/lib/axiosClient");
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn()
  }
}));

const mockStores = [
  {
    id: 1,
    name: "Store 1",
    location: "Location 1",
    chain: "Chain 1",
    volume: "1000",
    skus: 100,
    distributor: "Distributor 1"
  },
  {
    id: 2,
    name: "Store 2",
    location: "Location 2",
    chain: "Chain 2",
    volume: "2000",
    skus: 200,
    distributor: "Distributor 2"
  }
];

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

describe("StoreSelectionModal", () => {
  const defaultProps = {
    onClose: jest.fn(),
    distributors: mockDistributors,
    onStoreSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUserClient as jest.Mock).mockReturnValue({
      role: ENTITY_TYPES.MANUFACTURER,
      associatedUserId: 1
    });
    (isManufacturerAdmin as jest.Mock).mockReturnValue(true);
    (isDistributorAdmin as jest.Mock).mockReturnValue(false);
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockStores });
  });

  it("renders modal with store selection for manufacturer admin", () => {
    render(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Select Stores")).toBeInTheDocument();
    expect(screen.getByText("BY DISTRIBUTORS")).toBeInTheDocument();
    expect(screen.getByText("Select Logic Rule")).toBeInTheDocument();
  });

  it("handles distributor selection", () => {
    const { rerender } = render(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const selectInput = screen.getByRole("combobox");
    fireEvent.mouseDown(selectInput);
    const option = screen.getByText("Distributor 1");
    fireEvent.click(option);

    rerender(
      <TestWrapper
        defaultValues={{ store_selection_distributors: [{ value: "1" }] }}
      >
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Distributor 1")).toBeInTheDocument();
  });

  it("handles rule addition and removal", () => {
    const { rerender } = render(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const addRuleButton = screen.getByText("+ Create additional rule");
    fireEvent.click(addRuleButton);

    rerender(
      <TestWrapper
        defaultValues={{
          selected_stores: [],
          store_selection_rules: [
            {
              id: "1",
              category: "All Categories",
              operator: "<=",
              value1: 0
            }
          ]
        }}
      >
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Rule 1")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    rerender(
      <TestWrapper
        defaultValues={{ selected_stores: [], store_selection_rules: [] }}
      >
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.queryByText("Rule 1")).not.toBeInTheDocument();
  });

  it("handles store list visibility toggle", () => {
    const { rerender } = render(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const toggleButton = screen.getByText("See All Stores (0)");
    fireEvent.click(toggleButton);

    rerender(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Hide All Stores (0)")).toBeInTheDocument();
  });

  it("handles distributor admin role", () => {
    (getUserClient as jest.Mock).mockReturnValue({
      role: "DISTRIBUTOR_ADMIN",
      associatedUserId: 1
    });
    (isManufacturerAdmin as jest.Mock).mockReturnValue(false);
    (isDistributorAdmin as jest.Mock).mockReturnValue(true);

    render(
      <TestWrapper defaultValues={{ selected_stores: [] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.queryByText("BY DISTRIBUTORS")).not.toBeInTheDocument();
  });

  it("handles store selection and save", async () => {
    const { rerender } = render(
      <TestWrapper defaultValues={{ selected_stores: [1] }}>
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const toggleButton = screen.getByText("See All Stores (0)");
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    rerender(
      <TestWrapper
        defaultValues={{
          selected_stores: [1],
          store_selection_rules: [
            {
              id: "1",
              category: "All Categories",
              operator: "<=",
              value1: 0
            }
          ]
        }}
      >
        <StoreSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    await act(async () => {
      const doneButton = screen.getByText("Done");
      expect(doneButton).not.toBeDisabled();
      fireEvent.click(doneButton);
    });

    expect(defaultProps.onStoreSelect).toHaveBeenCalledWith([1]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
