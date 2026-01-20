"use client";

// Import core functionality
import Image from "next/image";

// Import Components
import RecommendedProductsCard from "@/components/Card/RecommendedProductsCard";
import ProgramPDFViewerModal from "@/components/Dialog/ProgramPDFViewerModal";
import StoreProgramDetailDashboardCards from "@/components/StoreProgramDetail/StoreProgramDetailDashboardCards";
import StoreProgramDetailHeader from "@/components/StoreProgramDetail/StoreProgramDetailHeader";
import StoreProgramDetailTabs from "@/components/StoreProgramDetail/StoreProgramDetailTabs";

// Import Utils
import SelectBox from "@/components/Form/SelectBox";
import { apiClient } from "@/lib/axiosClient";
import {
  buildAgreementOptions,
  buildProgramIdToAgreementIdsMap,
  DEFAULT_AGREEMENT_VALUE,
  filterAgreementsWithPrograms,
  filterProgramsByAgreement
} from "@/utils/agreementHelper";
import { getUserClient } from "@/utils/getUserClient";
import { calculateComplianceTotals } from "@/utils/programComplianceHelper";

// Import Types
import { StoreProgramDetail } from "@/types/ProgramTypes";

// Import Images
import chartBreakoutSquare from "@/assets/icons/chartBreakoutSquare.svg";
import { APP_ROUTES } from "@/configs/routes";
import {
  getProgramTimelineQueryParam,
  getUrlWithQueryParam
} from "@/utils/helper";
import {
  getProgramPdfUrl,
  getRetailerProgramDetails
} from "@/views/Distributor/programDetailAPIsClient";
import { useEffect, useMemo, useState } from "react";

interface ManufacturerProgramDetailProps {
  userId: number;
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters
}
const StoreProgramDetailPage = ({
  params,
  searchParams
}: ManufacturerProgramDetailProps) => {
  const { id } = params;
  const {
    manufacturerName,
    s: searchQuery,
    enrolledPage,
    notEnrolledPage,
    sort,
    sortKey,
    programTimeline
  } = searchParams;
  const manufacturerId = Number(id);
  const programTimelineParam = getProgramTimelineQueryParam(programTimeline);

  const [apiData, setApiData] = useState<StoreProgramDetail | null>(null);
  const [enrolledProgram, setEnrolledProgram] = useState<any>({});
  const [unenrolledProgram, setUnenrolledProgram] = useState<any>({});
  const [isPDFModalOpen, setIsPDFModalOpen] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>(
    DEFAULT_AGREEMENT_VALUE
  );

  // Get user to check distributor ID
  const user = getUserClient();
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;

  // Fetch program details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { storeProgramDetail, enrolledProgram, unenrolledProgram } =
          await getRetailerProgramDetails(
            manufacturerId,
            "STORE",
            searchQuery,
            Number(enrolledPage ?? 1),
            Number(notEnrolledPage ?? 1),
            sort,
            sortKey,
            programTimelineParam
          );
        setApiData(storeProgramDetail);
        setEnrolledProgram(enrolledProgram);
        setUnenrolledProgram(unenrolledProgram);
      } catch (error) {
        console.error("Error fetching program details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    manufacturerId,
    searchQuery,
    enrolledPage,
    notEnrolledPage,
    sort,
    sortKey,
    programTimelineParam
  ]);

  // Fetch PDF URL
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoadingPdf(true);
        // Only fetch if timeline is Current or Upcoming (not Historical)
        if (
          programTimelineParam === "Current" ||
          programTimelineParam === "Upcoming"
        ) {
          const result = await getProgramPdfUrl(
            manufacturerId,
            programTimelineParam as "Current" | "Upcoming",
            "STORE"
          );
          setPdfUrl(result.program_pdf);
        } else {
          setPdfUrl(null);
        }
      } catch (error) {
        setPdfUrl(null);
      } finally {
        setLoadingPdf(false);
      }
    };

    fetchPdf();
  }, [manufacturerId, distributorId, programTimelineParam]);

  // Fetch agreements
  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        // Build URL with timeline parameter
        let url = `/agreements?manufacturerId=${manufacturerId}`;
        if (programTimelineParam) {
          url += `&timeline=${programTimelineParam}`;
        }

        const response = await apiClient.get(url);

        const agreementsData = response?.data?.agreements || [];

        setAgreements(agreementsData);

        // Auto-select agreement based on priority
        if (agreementsData.length > 0) {
          const uniqueAgreements = new Map<number, string>();
          agreementsData.forEach((agreement: any) => {
            if (!uniqueAgreements.has(agreement.agreementId)) {
              uniqueAgreements.set(
                agreement.agreementId,
                agreement.agreementName
              );
            }
          });

          if (uniqueAgreements.size === 1) {
            // If only one agreement, select it
            const agreementId = Array.from(uniqueAgreements.keys())[0];
            setSelectedAgreementId(String(agreementId));
          } else if (uniqueAgreements.size > 1) {
            // If multiple agreements, find one with "Retail" in the name
            const retailAgreement = Array.from(uniqueAgreements.entries()).find(
              ([, name]) => name.toLowerCase().includes("retail")
            );

            if (retailAgreement) {
              setSelectedAgreementId(String(retailAgreement[0]));
            } else {
              // If no "Retail" agreement found, select the first one
              const firstAgreementId = Array.from(uniqueAgreements.keys())[0];
              setSelectedAgreementId(String(firstAgreementId));
            }
          }
        }
      } catch (error) {
        setAgreements([]);
      }
    };

    fetchAgreements();
  }, [manufacturerId]);

  // Process agreements data to create lookup maps (must be before early return)
  const programIdToAgreementsMap = useMemo(() => {
    if (!agreements || agreements.length === 0) {
      return new Map<number, number[]>();
    }
    return buildProgramIdToAgreementIdsMap(agreements);
  }, [agreements]);

  // Filter programs based on selected agreement (must be before early return)
  const retailerPrograms = apiData?.programs?.retailer || [];

  const agreementOptions = useMemo(() => {
    if (!agreements || agreements.length === 0) {
      return [];
    }

    // Filter out agreements that don't have any programs
    const retailerProgramsList = apiData?.programs?.retailer || [];
    const agreementsWithPrograms = filterAgreementsWithPrograms(
      agreements,
      retailerProgramsList
    );

    return buildAgreementOptions(agreementsWithPrograms);
  }, [agreements, apiData?.programs?.retailer]);

  // Auto-select first agreement when options are loaded
  useEffect(() => {
    if (
      agreementOptions.length > 0 &&
      selectedAgreementId === DEFAULT_AGREEMENT_VALUE
    ) {
      setSelectedAgreementId(agreementOptions[0].value);
    }
  }, [agreementOptions, selectedAgreementId]);

  const filteredRetailerPrograms = useMemo(() => {
    if (!apiData?.programs?.retailer) {
      return [];
    }
    return filterProgramsByAgreement(
      retailerPrograms as Array<{ id?: number; [key: string]: any }>,
      selectedAgreementId,
      programIdToAgreementsMap
    );
  }, [
    retailerPrograms,
    selectedAgreementId,
    programIdToAgreementsMap,
    apiData?.programs?.retailer
  ]);

  // Extract programIds from filtered retailer programs for StoreTable
  const programIds = useMemo(
    () => filteredRetailerPrograms.map((program: any) => program.id) || [],
    [filteredRetailerPrograms]
  );

  // Calculate compliance totals using filtered programs
  const { totalProgramEnrollments, totalProgramCompliances } =
    calculateComplianceTotals(filteredRetailerPrograms, []);

  if (loading || !apiData) {
    return <div>Loading...</div>;
  }

  const backUrl = getUrlWithQueryParam(
    `${APP_ROUTES.storePrograms}`,
    "programTimeline",
    programTimeline
  );

  const totalStores =
    Number(enrolledProgram?.totalStores ?? "0") +
    Number(unenrolledProgram?.totalStores ?? "");
  const totalEnrolledStores = Number(enrolledProgram?.totalStores ?? "0");

  return (
    <>
      {/* PDF Viewer Modal */}
      {pdfUrl && (
        <ProgramPDFViewerModal
          isOpen={isPDFModalOpen}
          onClose={() => setIsPDFModalOpen(false)}
          pdfUrl={pdfUrl}
        />
      )}

      <StoreProgramDetailHeader
        manufacturer={
          apiData?.manufacturer ?? {
            name: "Store Program Details",
            avatar: ""
          }
        }
        backUrl={backUrl}
      />

      <StoreProgramDetailDashboardCards
        salesData={apiData.salesData}
        totalEnrolledStores={totalEnrolledStores}
        totalStores={totalStores}
        totalProgramEnrollments={totalProgramEnrollments}
        totalProgramCompliances={totalProgramCompliances}
        isAuthorized={apiData?.manufacturer?.authorized !== false}
        cardCount={3}
      />

      {/* Select Agreement */}
      {(() => {
        if (!agreements || agreements.length === 0) {
          return null;
        }

        // Check if there's only one agreement option after filtering
        const hasSingleAgreement = agreementOptions.length === 1;
        const singleAgreementName = hasSingleAgreement
          ? agreementOptions[0].label
          : null;

        return (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4 sm:mb-0 mt-4">
            {hasSingleAgreement ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <span className="text-sm font-medium text-heading-light">
                  Viewing Agreement:
                </span>
                <div className="rounded-md outline-none pl-3 pr-9 border-border-gray border max-w-full text-sm font-medium text-heading-light px-2 py-1.5 bg-gray-50 cursor-disabled select-none">
                  {singleAgreementName}
                </div>
              </div>
            ) : (
              <>
                <label
                  htmlFor="agreement-select"
                  className="text-sm font-medium text-heading-light"
                >
                  Select Agreement:
                </label>
                <SelectBox
                  id="agreement-select"
                  options={agreementOptions}
                  value={selectedAgreementId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedAgreementId(e.target.value);
                  }}
                  className="text-sm font-medium text-heading-light px-2 py-1.5"
                  placeholder="Select Agreement"
                />
              </>
            )}
          </div>
        );
      })()}

      <StoreProgramDetailTabs
        retailerPrograms={filteredRetailerPrograms}
        programStoreCompliancesDetail={[]}
        enrolledProgram={enrolledProgram}
        unenrolledProgram={unenrolledProgram}
        manufacturerId={manufacturerId}
        manufacturerName={manufacturerName}
        manufacturerLogo={apiData?.manufacturer?.avatar}
        programTimeline={programTimelineParam}
        isSalesRep={true}
        pdfButton={
          <div className="flex items-center gap-3 ml-0 sm:ml-auto">
            {pdfUrl && programTimeline !== "Historical" && !loadingPdf && (
              <div className="">
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
            )}
          </div>
        }
        programIds={programIds}
      />

      <RecommendedProductsCard
        manufacturerId={manufacturerId}
        programsType="STORE"
      />
    </>
  );
};

export default StoreProgramDetailPage;
