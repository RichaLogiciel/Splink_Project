"use client";

import { DistributorProgram } from "@/types/ProgramTypes";
import { getRebateValue } from "@/utils/programHelper";
import Link from "next/link";
import React, { useMemo } from "react";
import Accordion from "./BaseAccordion";

interface AgreementAccordionProps {
  agreements: Array<{ agreementId: number; agreementName: string }>;
  programsByAgreement: Record<string, DistributorProgram[]>;
  manufacturerId: string;
  manufacturerName: string;
  url: string;
  programTimeline?: string;
  isInternal?: boolean;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
}

const AgreementAccordion: React.FC<AgreementAccordionProps> = ({
  agreements,
  programsByAgreement,
  manufacturerId,
  manufacturerName,
  url,
  programTimeline,
  isInternal,
  warehouseId,
  startDate,
  endDate
}) => {
  // Build program link URL
  const buildProgramLink = (program: DistributorProgram): string => {
    const params = new URLSearchParams({
      id: manufacturerId,
      manufacturerName,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(programTimeline && { programTimeline }),
      ...(isInternal !== undefined && { isInternal: String(isInternal) }),
      ...(warehouseId && { warehouseId })
    });
    return `${url}${manufacturerId}?${params.toString()}`;
  };

  // Sort agreements by name
  const sortedAgreements = useMemo(() => {
    return [...agreements].sort((a, b) =>
      a.agreementName.localeCompare(b.agreementName)
    );
  }, [agreements]);

  if (sortedAgreements.length === 0) {
    return (
      <div className="p-4 text-center text-heading-light font-medium">
        No agreements found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedAgreements.map((agreement) => {
        const agreementIdStr = String(agreement.agreementId);
        const programs = programsByAgreement[agreementIdStr] || [];

        return (
          <Accordion
            key={agreement.agreementId}
            defaultOpen={true}
            title={
              <span className="text-sm sm:text-base font-medium">
                {agreement.agreementName}
              </span>
            }
            content={
              programs.length > 0 ? (
                <div className="space-y-0">
                  {programs.map((program, index) => {
                    const rebateValue =
                      program?.rebateRange ||
                      getRebateValue(program.rebate)?.toString() ||
                      "";
                    return (
                      <Link
                        key={`${program.id}-${index}`}
                        href={buildProgramLink(program)}
                        className="flex justify-between items-center p-3 border-b border-border-gray text-filter-light hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-normal">{program.type}</span>
                        {rebateValue && (
                          <span className="text-green font-medium">
                            {rebateValue}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-heading-light font-medium text-sm">
                  No programs found for this agreement
                </div>
              )
            }
          />
        );
      })}
    </div>
  );
};

export default AgreementAccordion;
