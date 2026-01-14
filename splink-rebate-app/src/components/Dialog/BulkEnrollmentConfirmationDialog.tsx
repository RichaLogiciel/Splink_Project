"use client";

import Button from "@/core-ui/Button";
import {
  DEFAULT_AGREEMENT_VALUE,
  filterAgreementsWithPrograms
} from "@/utils/agreementHelper";
import { Agreement } from "@/utils/agreementsAPI";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import React from "react";

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

interface BulkEnrollmentConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: "enroll" | "unenroll";
  selectedStoreCount: number;
  agreements: Agreement[];
  isLoading?: boolean;
  selectedAgreementId?: string;
  retailerPrograms?: Array<{ id?: number; [key: string]: any }>;
}

const BulkEnrollmentConfirmationDialog: React.FC<
  BulkEnrollmentConfirmationDialogProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedStoreCount,
  agreements,
  isLoading = false,
  selectedAgreementId,
  retailerPrograms
}) => {
  // Filter and deduplicate agreements by agreementId
  const relevantAgreements = React.useMemo(() => {
    // Filter out agreements that don't have any programs
    let filteredAgreements = filterAgreementsWithPrograms(
      agreements,
      retailerPrograms
    );

    // Filter by selectedAgreementId if provided and not "All Agreements"
    if (
      selectedAgreementId &&
      selectedAgreementId !== DEFAULT_AGREEMENT_VALUE
    ) {
      filteredAgreements = filteredAgreements.filter(
        (agreement) => agreement.agreementId.toString() === selectedAgreementId
      );
    }

    // Deduplicate agreements by agreementId
    return Array.from(
      new Map(
        filteredAgreements.map((agreement) => [
          agreement.agreementId,
          agreement
        ])
      ).values()
    );
  }, [agreements, selectedAgreementId, retailerPrograms]);

  const agreementIds = relevantAgreements.map((a) => a.agreementId);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl w-full rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-filter-light">
              Confirm {action === "unenroll" ? "Unenrollment" : "Enrollment"}
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
              disabled={isLoading}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-heading-light">
              <p className="mb-2">
                You are about to{" "}
                <span className="font-semibold">
                  {action === "enroll" ? "enroll" : "unenroll"}
                </span>{" "}
                <span className="font-semibold">{selectedStoreCount}</span>{" "}
                {selectedStoreCount === 1 ? "store" : "stores"} into{" "}
                <span className="font-semibold">
                  {relevantAgreements.length}
                </span>{" "}
                {relevantAgreements.length === 1 ? "agreement" : "agreements"}.
              </p>
            </div>

            {relevantAgreements.length > 0 ? (
              <div className="border border-border-gray rounded-md p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-filter-light mb-2">
                  Agreements:
                </h4>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {relevantAgreements.map((agreement) => (
                    <li
                      key={agreement.agreementId}
                      className="text-sm text-heading-light"
                    >
                      •{" "}
                      {agreement.agreementName ||
                        `Agreement ${agreement.agreementId}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border border-yellow-300 rounded-md p-4 bg-yellow-50">
                <p className="text-sm text-yellow-800">
                  No agreements available. Please select an agreement or ensure
                  agreements are configured for this manufacturer.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border-gray">
            <Button
              color=""
              size="md"
              onClick={onClose}
              className="min-w-[100px]"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              color={action === "unenroll" ? "danger" : "success"}
              size="md"
              onClick={onConfirm}
              disabled={isLoading || relevantAgreements.length === 0}
              className="min-w-[100px]"
            >
              {isLoading
                ? "Processing..."
                : action === "unenroll"
                  ? "Confirm Unenroll"
                  : "Confirm Enroll"}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default BulkEnrollmentConfirmationDialog;
