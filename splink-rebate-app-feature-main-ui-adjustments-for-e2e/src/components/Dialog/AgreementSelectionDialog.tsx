"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  fetchAgreementsByManufacturer,
  fetchStoreAgreementsByManufacturer,
  Agreement
} from "@/utils/agreementsAPI";
import Button from "@/core-ui/Button";

// Close icon - you can replace this with an actual close icon from your assets
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

interface AgreementSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  manufacturerId: number | string;
  storeId?: string | number;
  action?: "enroll" | "unenroll";
  onEnroll: (agreementIds: number[]) => void;
  buttonText?: string; // Custom button text (e.g., "Select" instead of "Enroll")
}

const AgreementSelectionDialog: React.FC<AgreementSelectionDialogProps> = ({
  isOpen,
  onClose,
  manufacturerId,
  storeId,
  action = "enroll",
  onEnroll,
  buttonText
}) => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [selectedAgreementIds, setSelectedAgreementIds] = useState<number[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch agreements when dialog opens
  useEffect(() => {
    if (isOpen && manufacturerId) {
      setIsFetching(true);
      // Use store-scoped endpoint if storeId is provided, passing action to get correct array
      const fetchFunction = storeId
        ? fetchStoreAgreementsByManufacturer(storeId, manufacturerId, action)
        : fetchAgreementsByManufacturer(manufacturerId);

      fetchFunction
        .then((data) => {
          console.log("Agreements fetched in dialog:", data);
          setAgreements(data);
        })
        .catch((error) => {
          console.error("Error fetching agreements:", error);
          setAgreements([]);
        })
        .finally(() => {
          setIsFetching(false);
        });
    } else if (!isOpen) {
      // Reset state when dialog closes
      setSelectedAgreementIds([]);
      setAgreements([]);
    }
  }, [isOpen, manufacturerId, storeId, action]);

  const handleAgreementToggle = (agreementId: number) => {
    setSelectedAgreementIds((prev) => {
      if (prev.includes(agreementId)) {
        return prev.filter((id) => id !== agreementId);
      } else {
        return [...prev, agreementId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedAgreementIds.length === agreements.length) {
      setSelectedAgreementIds([]);
    } else {
      setSelectedAgreementIds(agreements.map((a) => a.agreementId));
    }
  };

  const handleEnroll = () => {
    if (selectedAgreementIds.length === 0) {
      return;
    }

    onEnroll(selectedAgreementIds);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl w-full rounded-lg bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-filter-light">
              {action === "unenroll"
                ? "Unenroll from Agreements"
                : "Select Agreements"}
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          {storeId && (
            <div className="text-sm text-heading-very-light mb-4">
              Store ID: {storeId}
            </div>
          )}

          {isFetching ? (
            <div className="py-8 text-center text-heading-very-light">
              Loading agreements...
            </div>
          ) : agreements.length === 0 ? (
            <div className="py-8 text-center text-heading-very-light">
              No agreements found for this manufacturer.
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="mb-4 pb-3 border-b border-border-gray">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      agreements.length > 0 &&
                      selectedAgreementIds.length === agreements.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-green border-border-gray rounded focus:ring-green focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-filter-light">
                    Select All
                  </span>
                  {selectedAgreementIds.length > 0 && (
                    <span className="text-sm text-heading-very-light">
                      ({selectedAgreementIds.length} selected)
                    </span>
                  )}
                </label>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {agreements.map((agreement) => (
                  <label
                    key={agreement.agreementId}
                    className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer border border-transparent hover:border-border-gray transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgreementIds.includes(
                        agreement.agreementId
                      )}
                      onChange={() =>
                        handleAgreementToggle(agreement.agreementId)
                      }
                      className="mt-1 w-4 h-4 text-green border-border-gray rounded focus:ring-green focus:ring-2 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-filter-light">
                        {agreement.agreementName ||
                          `Agreement ${agreement.agreementId}`}
                      </div>
                      {agreement.programId && (
                        <div className="text-xs text-heading-very-light mt-1">
                          Program ID: {agreement.programId}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-gray">
                <Button
                  color=""
                  size="md"
                  onClick={onClose}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  color={action === "unenroll" ? "danger" : "success"}
                  size="md"
                  onClick={handleEnroll}
                  disabled={selectedAgreementIds.length === 0 || isLoading}
                  className="min-w-[100px]"
                >
                  {isLoading
                    ? "Processing..."
                    : buttonText ||
                      (action === "unenroll" ? "Unenroll" : "Enroll")}
                </Button>
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default AgreementSelectionDialog;
