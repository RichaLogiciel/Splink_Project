"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import React, { useEffect, useRef, useState } from "react";
import Button from "../../core-ui/Button";
import Checkbox from "../../core-ui/Checkbox";
import { Agreement, GroupedAgreement } from "../../utils/agreementsAPI";
import ManufacturerAvatar from "../Avatar/ManufacturerAvatar";

// Close icon
const CloseIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Success checkmark icon
const SuccessIcon = () => (
  <svg
    className="w-16 h-16 text-green"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

interface AgreementSelectionModalProps {
  isOpen: boolean;
  onClose: (selectedAgreementIds?: number[]) => void;
  groupedAgreements: GroupedAgreement[];
  selectedManufacturerIds?: number[];
  action: "enroll" | "unenroll";
  onConfirm: (agreementIds: number[]) => Promise<void>;
  isLoading?: boolean;
  selectAllByDefault?: boolean; // If true, pre-select all agreements
  isSingleManufacturer?: boolean; // If true, show Done/Cancel instead of Enroll/Unenroll button
  onDone?: (agreementIds: number[]) => void; // Callback for Done button in single manufacturer mode
  manufacturerId?: number; // Manufacturer ID for single manufacturer mode
  preSelectedAgreementIds?: Set<number>; // Pre-selected agreement IDs to maintain state
}

type ModalState = "initial" | "loading" | "success" | "error";

const AgreementSelectionModal: React.FC<AgreementSelectionModalProps> = ({
  isOpen,
  onClose,
  groupedAgreements,
  selectedManufacturerIds = [],
  action,
  onConfirm,
  isLoading = false,
  selectAllByDefault = false,
  isSingleManufacturer = false,
  onDone,
  manufacturerId,
  preSelectedAgreementIds
}) => {
  const [modalState, setModalState] = useState<ModalState>("initial");
  const [selectedAgreementIds, setSelectedAgreementIds] = useState<Set<number>>(
    new Set()
  );
  const [manufacturerSelectionState, setManufacturerSelectionState] = useState<
    Map<number, boolean>
  >(new Map());
  const [enrolledAgreements, setEnrolledAgreements] = useState<Agreement[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const hasInitializedRef = useRef(false);

  // Calculate total agreements count
  const totalAgreements = groupedAgreements.reduce(
    (sum, group) => sum + group.agreements.length,
    0
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModalState("initial");
      setSelectedAgreementIds(new Set());
      setManufacturerSelectionState(new Map());
      setEnrolledAgreements([]);
      setErrorMessage("");
      setErrorDetails("");
      hasInitializedRef.current = false;
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Always reset state first when modal opens
      setSelectedAgreementIds(new Set());
      setManufacturerSelectionState(new Map());
      hasInitializedRef.current = false;
    }
  }, [isOpen]);

  // Pre-select agreements based on preSelectedAgreementIds or selectAllByDefault
  useEffect(() => {
    if (
      isOpen &&
      totalAgreements > 0 &&
      groupedAgreements.length > 0 &&
      !hasInitializedRef.current
    ) {
      // Reset first
      setSelectedAgreementIds(new Set());
      setManufacturerSelectionState(new Map());

      // If preSelectedAgreementIds is provided, use those; otherwise check selectAllByDefault
      if (preSelectedAgreementIds && preSelectedAgreementIds.size > 0) {
        // Use pre-selected agreements
        const selectedIds = new Set<number>();
        const manufacturerState = new Map<number, boolean>();

        groupedAgreements.forEach((group) => {
          let allGroupSelected = true;
          let hasAnySelected = false;
          group.agreements.forEach((agreement) => {
            if (preSelectedAgreementIds.has(agreement.agreementId)) {
              selectedIds.add(agreement.agreementId);
              hasAnySelected = true;
            } else {
              allGroupSelected = false;
            }
          });
          manufacturerState.set(
            group.manufacturerId,
            hasAnySelected && allGroupSelected
          );
        });

        setSelectedAgreementIds(selectedIds);
        setManufacturerSelectionState(manufacturerState);
      } else if (selectAllByDefault && !isSingleManufacturer) {
        // Select all agreements only for bulk action (not single manufacturer)
        const allIds = new Set<number>();
        const manufacturerState = new Map<number, boolean>();

        groupedAgreements.forEach((group) => {
          group.agreements.forEach((agreement) => {
            allIds.add(agreement.agreementId);
          });
          manufacturerState.set(group.manufacturerId, true);
        });

        setSelectedAgreementIds(allIds);
        setManufacturerSelectionState(manufacturerState);
      }
      // For single manufacturer modal, start with all unchecked (no pre-selection)

      hasInitializedRef.current = true;
    }
  }, [
    isOpen,
    selectAllByDefault,
    isSingleManufacturer,
    groupedAgreements,
    totalAgreements,
    preSelectedAgreementIds
  ]);

  // Handle select all agreements
  const handleSelectAll = () => {
    if (selectedAgreementIds.size === totalAgreements) {
      setSelectedAgreementIds(new Set());
      setManufacturerSelectionState(new Map());
    } else {
      const allIds = new Set<number>();
      const manufacturerState = new Map<number, boolean>();

      groupedAgreements.forEach((group) => {
        group.agreements.forEach((agreement) => {
          allIds.add(agreement.agreementId);
        });
        manufacturerState.set(group.manufacturerId, true);
      });

      setSelectedAgreementIds(allIds);
      setManufacturerSelectionState(manufacturerState);
    }
  };

  // Handle select all for a specific manufacturer
  const handleSelectAllForManufacturer = (manufacturerId: number) => {
    const group = groupedAgreements.find(
      (g) => g.manufacturerId === manufacturerId
    );
    if (!group) return;

    const groupAgreementIds = group.agreements.map((a) => a.agreementId);
    const allSelected = groupAgreementIds.every((id) =>
      selectedAgreementIds.has(id)
    );

    const newSelected = new Set(selectedAgreementIds);
    const newManufacturerState = new Map(manufacturerSelectionState);

    if (allSelected) {
      // Deselect all for this manufacturer
      groupAgreementIds.forEach((id) => newSelected.delete(id));
      newManufacturerState.set(manufacturerId, false);
    } else {
      // Select all for this manufacturer
      groupAgreementIds.forEach((id) => newSelected.add(id));
      newManufacturerState.set(manufacturerId, true);
    }

    setSelectedAgreementIds(newSelected);
    setManufacturerSelectionState(newManufacturerState);
  };

  // Handle individual agreement toggle
  const handleAgreementToggle = (
    agreementId: number,
    manufacturerId: number
  ) => {
    const newSelected = new Set(selectedAgreementIds);
    const group = groupedAgreements.find(
      (g) => g.manufacturerId === manufacturerId
    );

    if (newSelected.has(agreementId)) {
      newSelected.delete(agreementId);
    } else {
      newSelected.add(agreementId);
    }

    // Update manufacturer selection state
    if (group) {
      const allSelected = group.agreements.every((a) =>
        newSelected.has(a.agreementId)
      );
      const newManufacturerState = new Map(manufacturerSelectionState);
      newManufacturerState.set(manufacturerId, allSelected);
      setManufacturerSelectionState(newManufacturerState);
    }

    setSelectedAgreementIds(newSelected);
  };

  // Handle confirm button click
  const handleConfirm = async () => {
    if (selectedAgreementIds.size === 0) {
      return;
    }

    // For single manufacturer mode, just call onDone and close
    if (isSingleManufacturer && onDone) {
      onDone(Array.from(selectedAgreementIds));
      onClose(Array.from(selectedAgreementIds));
      return;
    }

    // For bulk action mode, call API and close immediately
    // Close modal immediately - API call happens in background, toast message will be shown by parent component
    onClose(Array.from(selectedAgreementIds));

    // Call API in background (fire and forget - errors will be handled by parent component via toast)
    onConfirm(Array.from(selectedAgreementIds)).catch((error: any) => {
      console.error("Error during enrollment:", error);
      // Error toast is already handled by parent component
    });
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Extract date range from agreement name if present (format: "Agreement Name (YYYY-MM-DD to YYYY-MM-DD)")
  const extractDateRange = (agreementName: string) => {
    if (!agreementName || typeof agreementName !== "string") {
      return null;
    }
    const match = agreementName.match(
      /\((\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})\)/
    );
    if (match && match[1] && match[2]) {
      return {
        startDate: match[1],
        endDate: match[2],
        nameWithoutDate: agreementName
          .replace(/\s*\(\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}\)\s*/, "")
          .trim()
      };
    }
    return null;
  };

  const isAllSelected =
    selectedAgreementIds.size === totalAgreements && totalAgreements > 0;

  return (
    <Dialog
      open={isOpen}
      onClose={() => onClose(Array.from(selectedAgreementIds))}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-3xl w-full rounded-lg bg-white shadow-xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-gray">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-filter-light mb-1">
                {modalState === "loading"
                  ? "Processing Request"
                  : modalState === "success"
                    ? "Request Submitted"
                    : modalState === "error"
                      ? "Request Failed"
                      : "Select Agreements"}
              </DialogTitle>
              {modalState === "initial" && (
                <p className="text-sm text-heading-light">
                  {`Choose one or more agreements to ${action === "enroll" ? "enroll" : "unenroll"}.`}
                </p>
              )}
            </div>
            {modalState !== "loading" && (
              <button
                onClick={() => onClose(Array.from(selectedAgreementIds))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            {/* Loader for fetching agreements */}
            {isLoading &&
              groupedAgreements.length === 0 &&
              modalState === "initial" && (
                <div className="absolute inset-0 bg-white flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green"></div>
                    </div>
                    <p className="text-sm text-heading-light">
                      Loading agreements...
                    </p>
                  </div>
                </div>
              )}

            {modalState === "loading" && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-filter-light mb-2">
                  Processing Your Request...
                </h3>
                <p className="text-sm text-heading-light">
                  Please wait while we submit your enrollment request
                </p>
                <div className="flex justify-center gap-1 mt-6">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}

            {modalState === "success" ? (
              <div className="py-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-filter-light mb-2">
                    Request Received!
                  </h3>
                  <p className="text-sm text-heading-light">
                    We&apos;ve received your enrollment request and it will be
                    processed within 24 hours.
                  </p>
                </div>

                {/* What happens next section */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <h4 className="text-sm font-semibold text-filter-light">
                      What happens next?
                    </h4>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-heading-light ml-7">
                    <li>Your request is queued for processing</li>
                    <li>
                      Stores will be updated once the request is completed
                    </li>
                  </ul>
                </div>
              </div>
            ) : modalState === "error" ? (
              <div className="py-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-3xl font-bold text-red-600">!</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-filter-light mb-2">
                    Enrollment Failed
                  </h3>
                  <p className="text-sm text-heading-light">
                    We couldn&apos;t process your enrollment request at this
                    time. Please try again or contact support if the problem
                    persists.
                  </p>
                </div>

                {/* Error Details Section */}
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <h4 className="text-sm font-semibold text-filter-light">
                      Error Details
                    </h4>
                  </div>
                  <div className="space-y-2 text-sm text-heading-light">
                    <p>
                      <span className="font-medium">Error Code:</span>{" "}
                      ERR_ENROLLMENT_500
                    </p>
                    <p>
                      {errorDetails ||
                        "Unable to connect to the enrollment service. The service may be temporarily unavailable."}
                    </p>
                    <p>
                      <span className="font-medium">
                        Attempted to {action}:
                      </span>{" "}
                      {selectedAgreementIds.size} agreement
                      {selectedAgreementIds.size !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Troubleshooting Tips */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <h4 className="text-sm font-semibold text-filter-light">
                      Troubleshooting Tips:
                    </h4>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-heading-light ml-7">
                    <li>Check your internet connection</li>
                    <li>
                      Verify that the selected agreements are still active
                    </li>
                    <li>Try refreshing the page and submitting again</li>
                    <li>Contact support if the issue continues</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {groupedAgreements.length > 0 && (
                  <div className="mt-4 mb-4 pb-3 border-b border-border-gray flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        id="select-all-agreements"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium text-filter-light">
                        Select All Agreements
                      </span>
                    </label>
                  </div>
                )}

                {/* Grouped Agreements */}
                <div className="space-y-4">
                  {groupedAgreements.map((group) => {
                    const isManufacturerAllSelected =
                      manufacturerSelectionState.get(group.manufacturerId) ??
                      group.agreements.every((a) =>
                        selectedAgreementIds.has(a.agreementId)
                      );

                    const selectedCount = group.agreements.filter((a) =>
                      selectedAgreementIds.has(a.agreementId)
                    ).length;

                    return (
                      <div
                        key={group.manufacturerId}
                        className="bg-gray-50 rounded-lg p-4"
                      >
                        {/* Manufacturer Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-1">
                            <ManufacturerAvatar
                              user={{
                                name: group.manufacturerName,
                                avatar: group.manufacturerLogo
                              }}
                            />
                            <div className="w-full sm:w-auto sm:flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                    selectedCount > 0
                                      ? "bg-green text-white"
                                      : "bg-gray-200 text-filter-light"
                                  }`}
                                >
                                  {selectedCount} selected
                                </span>
                                <span className="text-xs text-heading-very-light">
                                  {group.agreements.length} agreement
                                  {group.agreements.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                  available
                                </span>
                              </div>
                            </div>
                          </div>
                          {group.agreements.length > 1 &&
                            isManufacturerAllSelected && (
                              <button
                                onClick={() =>
                                  handleSelectAllForManufacturer(
                                    group.manufacturerId
                                  )
                                }
                                className="text-xs text-heading-light hover:text-filter-light flex items-center gap-1"
                              >
                                Deselect All
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </button>
                            )}
                          {group.agreements.length > 1 &&
                            !isManufacturerAllSelected && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  id={`select-all-${group.manufacturerId}`}
                                  checked={isManufacturerAllSelected}
                                  onChange={() =>
                                    handleSelectAllForManufacturer(
                                      group.manufacturerId
                                    )
                                  }
                                  className="w-5 h-5"
                                />
                                <span className="text-xs text-heading-very-light">
                                  Select All
                                </span>
                              </label>
                            )}
                        </div>

                        {/* Agreements List */}
                        <div className="space-y-2">
                          {group.agreements.map((agreement) => {
                            const isSelected = selectedAgreementIds.has(
                              agreement.agreementId
                            );
                            const dateRange = extractDateRange(
                              agreement.agreementName
                            );
                            let displayName = dateRange
                              ? dateRange.nameWithoutDate
                              : agreement.agreementName;

                            // Remove manufacturer name from agreement name if it's duplicated
                            if (
                              displayName
                                .toLowerCase()
                                .includes(group.manufacturerName.toLowerCase())
                            ) {
                              displayName = displayName
                                .replace(
                                  new RegExp(group.manufacturerName, "gi"),
                                  ""
                                )
                                .trim();
                              // Remove any leading/trailing dashes or colons
                              displayName = displayName
                                .replace(/^[-:\s]+|[-:\s]+$/g, "")
                                .trim();
                            }

                            const endDateFormatted = agreement.endDate
                              ? formatDate(agreement.endDate)
                              : "";

                            return (
                              <label
                                key={agreement.agreementId}
                                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                                  isSelected
                                    ? "bg-green-200 border-green-300 hover:bg-green-200"
                                    : "bg-white border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                <Checkbox
                                  id={`agreement-${agreement.agreementId}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleAgreementToggle(
                                      agreement.agreementId,
                                      group.manufacturerId
                                    )
                                  }
                                  className={`w-5 h-5 ${
                                    isSelected
                                      ? "accent-green-600 checked:bg-green-600 checked:border-green-600"
                                      : ""
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-filter-light">
                                    {displayName}
                                  </div>
                                  {dateRange &&
                                    dateRange.startDate &&
                                    dateRange.endDate && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <svg
                                          className="w-4 h-4 text-heading-very-light"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <span className="text-xs text-heading-very-light">
                                          {dateRange.startDate} to{" "}
                                          {dateRange.endDate}
                                        </span>
                                      </div>
                                    )}
                                  {agreement.endDate && (
                                    <div className="mt-1">
                                      <span className="text-xs font-medium text-green-600">
                                        Ends: {endDateFormatted}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <svg
                                    className="w-5 h-5 text-green-500 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {groupedAgreements.length === 0 && !isLoading && (
                  <div className="py-8 text-center text-heading-very-light">
                    No agreements found.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {modalState === "initial" && !isLoading && (
            <div className="flex flex-col sm:flex-row gap-2.5 items-end sm:items-center justify-between p-4 md:p-6 border-t border-border-gray">
              <div className="w-full sm:w-auto text-left text-sm text-heading-light">
                {selectedAgreementIds.size > 0 && (
                  <span>
                    {selectedAgreementIds.size} agreement
                    {selectedAgreementIds.size !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  color=""
                  size="md"
                  onClick={() => onClose(Array.from(selectedAgreementIds))}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  color={action === "enroll" ? "success" : "danger"}
                  size="md"
                  onClick={handleConfirm}
                  disabled={selectedAgreementIds.size === 0}
                  className={
                    isSingleManufacturer ? "min-w-[100px]" : "min-w-[180px]"
                  }
                >
                  {isSingleManufacturer
                    ? "Done"
                    : action === "enroll"
                      ? "Enroll"
                      : "Unenroll"}
                </Button>
              </div>
            </div>
          )}

          {modalState === "success" && (
            <div className="flex justify-end p-6 border-t border-border-gray">
              <Button
                color="success"
                size="md"
                onClick={() => onClose(Array.from(selectedAgreementIds))}
                className="min-w-[100px]"
              >
                Done
              </Button>
            </div>
          )}

          {modalState === "error" && (
            <div className="flex justify-end gap-3 p-6 border-t border-border-gray">
              <Button
                color=""
                size="md"
                onClick={() => onClose(Array.from(selectedAgreementIds))}
                className="min-w-[100px]"
              >
                Close
              </Button>
              <Button
                color="success"
                size="md"
                onClick={handleConfirm}
                className="min-w-[180px]"
              >
                Try Again
              </Button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default AgreementSelectionModal;
