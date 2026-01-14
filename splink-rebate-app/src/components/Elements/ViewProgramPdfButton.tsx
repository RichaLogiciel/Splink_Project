"use client";

import chartBreakoutSquare from "@/assets/icons/chartBreakoutSquare.svg";
import ProgramPDFViewerModal from "@/components/Dialog/ProgramPDFViewerModal";
import { isValidUrl, verifyUrlAccessible } from "@/utils/urlHelper";
import { getProgramPdfUrl } from "@/views/Distributor/programDetailAPIsClient";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface ViewProgramPdfButtonProps {
  manufacturerId: number;
  programTimeline: string;
  programType: "STORE" | "SPIFF" | "DISTRIBUTOR";
  pdfUrl?: string | null; // Optional: if provided, skip client-side fetching
}

export const ViewProgramPdfButton = ({
  manufacturerId,
  programTimeline,
  programType,
  pdfUrl: pdfUrlProp
}: ViewProgramPdfButtonProps) => {
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(
    pdfUrlProp !== undefined ? pdfUrlProp : null
  );
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isPdfUrlValid, setIsPdfUrlValid] = useState(true);

  // Validate PDF URL (used for both prop and fetched URLs)
  const validatePdfUrl = useCallback(
    async (
      url: string | null,
      doTheInaccessibleCheck = true
    ): Promise<boolean> => {
      if (!url) {
        setIsPdfUrlValid(false);
        return false;
      }

      // Validate the URL format first
      if (!isValidUrl(url)) {
        console.error("Invalid PDF URL format:", url);
        console.error(
          "Error: The PDF URL is not a valid URL format. Expected format: http://... or https://..."
        );
        setIsPdfUrlValid(false);
        return false;
      }

      // Verify the URL is accessible (returns HTTP 200)
      if (doTheInaccessibleCheck) {
        const isAccessible = await verifyUrlAccessible(url);
        if (!isAccessible) {
          console.error(
            "PDF URL is not accessible (does not return HTTP 200):",
            url
          );
          console.error(
            "Error: The PDF URL could not be accessed. Please verify the URL is correct and the file exists."
          );
          setIsPdfUrlValid(false);
          return false;
        }
      }

      setIsPdfUrlValid(true);
      return true;
    },
    []
  );

  // Fetch PDF URL (only used when pdfUrl prop is not provided)
  const fetchProgramPdf = useCallback(
    async (doTheInaccessibleCheck = true) => {
      try {
        setLoadingPdf(true);
        // Only fetch if timeline is Current or Upcoming (not Historical)
        if (programTimeline === "Current" || programTimeline === "Upcoming") {
          const result = await getProgramPdfUrl(
            manufacturerId,
            programTimeline as "Current" | "Upcoming",
            programType
          );

          const url = result.program_pdf;

          // Validate the fetched URL
          const isValid = await validatePdfUrl(url, doTheInaccessibleCheck);
          if (isValid) {
            setPdfUrl(url);
          } else {
            setPdfUrl(null);
          }
        } else {
          setPdfUrl(null);
          setIsPdfUrlValid(true);
        }
      } catch (error) {
        console.error("Error fetching program PDF:", error);
        setPdfUrl(null);
        setIsPdfUrlValid(false);
      } finally {
        setLoadingPdf(false);
      }
    },
    [manufacturerId, programTimeline, programType, validatePdfUrl]
  );

  // Update pdfUrl state when pdfUrlProp changes
  useEffect(() => {
    if (pdfUrlProp !== undefined) {
      setPdfUrl(pdfUrlProp);
    }
  }, [pdfUrlProp]);

  // Validate provided PDF URL on mount if prop is provided, or fetch if not
  useEffect(() => {
    if (pdfUrlProp !== undefined) {
      // PDF URL was provided as prop, validate it (without accessibility check for performance)
      validatePdfUrl(pdfUrlProp, false).then((isValid) => {
        if (!isValid) {
          setPdfUrl(null);
        }
      });
    } else {
      // No prop provided, fetch client-side
      fetchProgramPdf(false);
    }
  }, [
    manufacturerId,
    programTimeline,
    pdfUrlProp,
    validatePdfUrl,
    fetchProgramPdf
  ]);

  // Don't render button if PDF is not available or invalid
  if (
    !pdfUrl ||
    !isPdfUrlValid ||
    programTimeline === "Historical" ||
    loadingPdf
  ) {
    return null;
  }

  return (
    <>
      {/* PDF Viewer Modal */}
      {pdfUrl && (
        <ProgramPDFViewerModal
          pdfUrl={pdfUrl}
          isOpen={isPDFModalOpen}
          onClose={() => setIsPDFModalOpen(false)}
        />
      )}

      {/* View PDF Button */}
      <div className="w-auto min-w-fit">
        <button
          onClick={() => setIsPDFModalOpen(true)}
          className="flex items-center gap-[6px] px-3 py-1.5 border rounded border-green bg-white text-green text-sm font-medium hover:opacity-80 transition-colors overflow-hidden"
        >
          <Image
            src={chartBreakoutSquare.src}
            alt="View PDF Icon"
            width={14}
            height={14}
          />
          View Program PDF
        </button>
      </div>
    </>
  );
};
