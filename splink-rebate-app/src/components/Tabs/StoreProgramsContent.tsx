"use client";
import StoreProgramCard from "@/components/Card/StoreProgramCard";
import StoreProgramsLoading from "@/components/Loading/Programs/StoreProgramsLoading";
import { useFilterChange } from "@/contexts/FilterChangeContext";
import { usePageTransitionLoader } from "@/hooks/usePageTransitionLoader";
import { DistributorProgram, ProgramListingCard } from "@/types/ProgramTypes";
import { useEffect, useMemo, useRef } from "react";

interface StoreProgramsContentProps {
  programs: ProgramListingCard[];
  programTimeline?: string;
  isInternal?: boolean;
  warehouseId?: string;
  programsByManufacturerAndAgreement?: Record<
    string,
    Record<string, DistributorProgram[]>
  >;
  agreementNamesObj?: Record<string, Record<string, string>>;
}

const StoreProgramsContent = ({
  programs,
  programTimeline,
  isInternal,
  warehouseId,
  programsByManufacturerAndAgreement,
  agreementNamesObj
}: StoreProgramsContentProps) => {
  const { isPending } = usePageTransitionLoader();
  const { setFilterChanging } = useFilterChange();
  const prevProgramsRef = useRef<ProgramListingCard[]>([]);

  // Clear filter changing state when new data arrives
  useEffect(() => {
    const prevLength = prevProgramsRef.current.length;
    const currentLength = programs.length;

    // Create a stable key for comparison (array of IDs)
    const currentProgramIds = programs
      .map((p) => p.id)
      .sort()
      .join(",");
    const prevProgramIds = prevProgramsRef.current
      .map((p) => p.id)
      .sort()
      .join(",");

    // Check if programs have changed (new data loaded)
    const programsChanged = currentProgramIds !== prevProgramIds;

    // Check if length changed (empty to items or items to empty)
    const lengthChanged = prevLength !== currentLength;

    // Also check if the array reference changed (new data fetched)
    const isNewData = programs !== prevProgramsRef.current;

    // Clear loading if:
    // 1. Program IDs changed (different programs)
    // 2. Length changed (empty ↔ items)
    // 3. New data fetched (array reference changed) - handles both empty and non-empty cases
    if (programsChanged || lengthChanged || isNewData) {
      // Update previous programs when change detected
      prevProgramsRef.current = programs;

      // New data has loaded, clear the filter changing state
      // Use a small delay to ensure the component has fully rendered
      const timeoutId = setTimeout(() => {
        setFilterChanging(false);
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [programs, setFilterChanging]);

  // Build agreements array for each manufacturer
  const manufacturerAgreements = useMemo(() => {
    const result: Record<
      string,
      Array<{ agreementId: number; agreementName: string }>
    > = {};

    programs.forEach((store) => {
      const manufacturerId = store.id;
      const agreementsMap = agreementNamesObj?.[manufacturerId] || {};
      const programsByAgreement =
        programsByManufacturerAndAgreement?.[manufacturerId] || {};

      // Build agreements array from agreementNamesObj
      const agreements = Object.entries(agreementsMap).map(
        ([agreementIdStr, agreementName]) => ({
          agreementId: Number(agreementIdStr),
          agreementName
        })
      );

      // Also include agreements that have programs but no name (fallback)
      Object.keys(programsByAgreement).forEach((agreementIdStr) => {
        if (!agreementsMap[agreementIdStr]) {
          agreements.push({
            agreementId: Number(agreementIdStr),
            agreementName: `Agreement ${agreementIdStr}`
          });
        }
      });

      result[manufacturerId] = agreements;
    });

    return result;
  }, [programs, agreementNamesObj, programsByManufacturerAndAgreement]);

  if (programs.length === 0) {
    return (
      <p className="text-center">
        It seems there are currently no programs available. Please check back
        later or explore other sections.
      </p>
    );
  }

  return (
    <div className="relative min-h-[200px]">
      {/* Show loading overlay when params are changing */}
      {isPending && (
        <div className="absolute inset-0 z-10 bg-white backdrop-blur-sm">
          <StoreProgramsLoading
            numberOfItems={prevProgramsRef.current.length || programs.length}
          />
        </div>
      )}

      {/* Program cards content */}
      <div className="flex flex-wrap gap-4 mt-2">
        {programs.map((store: ProgramListingCard) => {
          const manufacturerId = store.id;
          const manufacturerName = store.manufacturer.name;
          const authorizedManufacturer = store.manufacturer?.authorized;
          const agreements = manufacturerAgreements[manufacturerId] || [];
          const programsByAgreement =
            programsByManufacturerAndAgreement?.[manufacturerId] || {};

          // Sort agreements by name
          const sortedAgreements = [...agreements].sort((a, b) =>
            a.agreementName.localeCompare(b.agreementName)
          );

          return (
            <StoreProgramCard
              key={store.id}
              store={store}
              manufacturerId={manufacturerId}
              manufacturerName={manufacturerName}
              authorizedManufacturer={authorizedManufacturer}
              sortedAgreements={sortedAgreements}
              programsByAgreement={programsByAgreement}
              programTimeline={programTimeline}
              isInternal={isInternal}
              warehouseId={warehouseId}
              defaultOpen={true}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StoreProgramsContent;
