"use client";
import { INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import {
  getUrlWithQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { isDistributorSalesRepManager } from "@/utils/rolesConditions";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ProgramTimelineOptionSelector from "./OptionSelector/ProgramTimelineOptionSelector";

interface InternalProgramTabProps {
  allProgramsUrl: string;
  internalProgramsUrl: string;
  allProgramsLabel?: string;
  internalProgramsLabel?: string;
  hideInternalForSalesRepManager?: boolean;
}

const InternalProgramTab = ({
  allProgramsUrl,
  internalProgramsUrl,
  allProgramsLabel = "Brand Sponsored",
  internalProgramsLabel = "Internal",
  hideInternalForSalesRepManager = false
}: InternalProgramTabProps) => {
  const searchParams = useSearchParams();
  const programTimeline = searchParams.get("programTimeline") || "";
  const currentUrlPath = usePathname();

  const user = getUserClient();
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const isInternalInitiativeEnabled = isDistributorFeatureEnabled(
    distributorId,
    INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Check if user is a sales rep manager to hide internal tab
  const isSalesRepManager = isDistributorSalesRepManager(user?.role ?? "");

  // Hide Internal tab for all roles on store and spiff pages
  const shouldHideInternalTab =
    currentUrlPath === "/app/programs/store" ||
    currentUrlPath === "/app/programs/spiff";

  return (
    <div className="pt-3 pb-5">
      <div className="min-h-7 flex items-center justify-between text-base border-b">
        <div className="flex gap-8">
          <div className="relative">
            <Link
              className={`mb-4 block font-medium ${
                currentUrlPath === allProgramsUrl ? "text-green" : ""
              }`}
              href={getUrlWithQueryParam(
                allProgramsUrl,
                "programTimeline",
                programTimeline
              )}
            >
              {allProgramsLabel}
            </Link>
            {currentUrlPath === allProgramsUrl && (
              <div className="absolute border-b-2 border-green bottom-0 w-full"></div>
            )}
          </div>
          {isInternalInitiativeEnabled &&
            (hideInternalForSalesRepManager ? !isSalesRepManager : true) &&
            !shouldHideInternalTab && (
              <div className="relative">
                <Link
                  className={`mb-4 block font-medium ${currentUrlPath === internalProgramsUrl ? "text-green" : ""}`}
                  href={getUrlWithQueryParam(
                    internalProgramsUrl,
                    "programTimeline",
                    programTimeline
                  )}
                >
                  {internalProgramsLabel}
                </Link>
                {currentUrlPath === internalProgramsUrl && (
                  <div className="absolute border-b-2 border-green bottom-0 w-full"></div>
                )}
              </div>
            )}
        </div>
        <ProgramTimelineOptionSelector className="mb-2" />
      </div>
    </div>
  );
};

export default InternalProgramTab;
