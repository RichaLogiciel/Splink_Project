"use client";

import greyUpArrow from "@/assets/icons/greyIconUp.svg";
import Image from "next/image";
import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";

// Import Utils
import { MESSAGES } from "@/configs/messages";
import { SpiffEarningStoreManufacturerDetail } from "@/types/StoreTypes";
import { getNumericDateString } from "@/utils/dateHelper";
import { formatNumber } from "@/utils/numberFormatter";
import { useSearchParams } from "next/navigation";
import Avatar from "../Avatar/ManufacturerAvatar";
import SpiffTierDetailsModal from "../Dialog/SpiffTierDetailsModal";

// Import Static Data Modifications

interface AllSPIFFOpportunitiesProps {
  data: SpiffEarningStoreManufacturerDetail[];
  storeId: string;
  embedded?: boolean;
  id?: string;
}

const AllSPIFFOpportunities: React.FC<AllSPIFFOpportunitiesProps> = ({
  data,
  storeId,
  embedded = false,
  id = "single-spiff-opportunities"
}) => {
  const [selectedManufacturer, setSelectedManufacturer] =
    useState<SpiffEarningStoreManufacturerDetail>();
  const [selectedTierId, setSelectedTierId] = useState<number | null>();
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const isInternal = useSearchParams().get("isInternal") == "true";

  return (
    <>
      <Card className={`w-full mb-6 ${embedded ? "mb-0 p-[0px]" : ""}`}>
        {!embedded && (
          <Row className="justify-between" marginBottom="mb-2">
            <div className="text-s font-normal text-heading-very-light">
              SPIFF Program Overview
            </div>
          </Row>
        )}
        <div className="overflow-x-auto text-left text-sm text-filter-light font-medium font-inter max-h-[50vh] overflow-y-auto -mr-2 pr-2">
          {/* Desktop Table View */}
          <table
            id={id}
            className="hidden md:table w-full border-collapse table-fixed"
          >
            <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white">
              <tr>
                <th className="font-medium pr-4 w-56">Manufacturer</th>
                <th className="font-medium pr-4 text-right">My Earnings</th>
                <th className="font-medium pr-4 text-right">
                  Available Programs
                </th>
                <th className="font-medium pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.length > 0 ? (
                data.map((opportunity, index) => (
                  <React.Fragment key={index}>
                    <tr
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(index)}
                    >
                      <td className="pr-4 py-3">
                        <Avatar user={opportunity} />
                      </td>
                      <td className="pr-4 py-3 text-base text-green text-right">
                        {isInternal && opportunity.spiffEarning == 0
                          ? "N/A"
                          : `$${formatNumber(opportunity.spiffEarning && opportunity.spiffEarning > 0 ? opportunity.spiffEarning : 0, false)}`}
                      </td>
                      <td className="pr-4 py-3 text-right">
                        {opportunity.programs
                          ? opportunity.programs.length
                          : "-"}
                      </td>
                      <td className="pr-4 py-3 text-right">
                        <Image
                          src={greyUpArrow.src}
                          width={12}
                          height={8}
                          alt="Accordion Arrow"
                          className={`transform transition-transform ${
                            expandedRows.includes(index) ? "rotate-180" : ""
                          } ml-auto`}
                        />
                      </td>
                    </tr>
                    {expandedRows.includes(index) && (
                      <tr className="w-full">
                        <td
                          colSpan={4}
                          className="bg-gray-50 shadow-[inset_0_0_1px_rgba(0,0,0,0.6)]"
                        >
                          <div className="overflow-x-auto px-4 py-3">
                            <table className="expandedRowTable w-full border-collapse table-fixed">
                              <thead>
                                <tr className="border-b text-heading-very-light text-xs">
                                  <th className="font-medium pr-4 text-left">
                                    Program Name
                                  </th>
                                  <th className="font-medium pr-4 text-left">
                                    Overview
                                  </th>
                                  <th className="font-medium pr-4 text-right">
                                    Earnings
                                  </th>
                                  <th className="font-medium pr-4 text-right">
                                    Start Date
                                  </th>
                                  <th className="font-medium pr-4 text-right">
                                    End Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {opportunity.programs &&
                                opportunity.programs.length ? (
                                  opportunity.programs.map((program, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b cursor-pointer hover:bg-white"
                                      onClick={() => {
                                        setSelectedManufacturer(opportunity);
                                        setSelectedTierId(program.id);
                                      }}
                                    >
                                      <td className="pr-4 py-3">
                                        {program.name}
                                      </td>
                                      <td className="pr-4 py-2">
                                        {program.overview}
                                      </td>
                                      <td className="pr-4 py-2 text-green text-right">
                                        {isInternal && program.spiffEarning == 0
                                          ? "N/A"
                                          : `$${formatNumber(program.spiffEarning && program.spiffEarning > 0 ? program.spiffEarning : 0, false)}`}
                                      </td>
                                      <td className="pr-4 py-3 text-right">
                                        {getNumericDateString(
                                          program.startDate.toString()
                                        )}
                                      </td>
                                      <td className="pr-4 py-3 text-right">
                                        {getNumericDateString(
                                          program.endDate.toString()
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr className="text-heading-very-light">
                                    <td
                                      className="text-center pt-3 text-sm"
                                      colSpan={4}
                                    >
                                      {MESSAGES.NO_RECORDS_FOUND}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr className="text-heading-very-light">
                  <td className="text-center pt-3 text-sm" colSpan={4}>
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {data?.length > 0 ? (
              data.map((opportunity, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(index)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={opportunity} />
                      <p className="text-xs text-heading-very-light">
                        {opportunity.programs
                          ? `${opportunity.programs.length} programs`
                          : "No programs"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green">
                        {isInternal && opportunity.spiffEarning == 0
                          ? "N/A"
                          : `$${formatNumber(opportunity.spiffEarning && opportunity.spiffEarning > 0 ? opportunity.spiffEarning : 0, false)}`}
                      </span>
                      <Image
                        src={greyUpArrow.src}
                        width={12}
                        height={8}
                        alt="Accordion Arrow"
                        className={`transform transition-transform ${
                          expandedRows.includes(index) ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Programs on Mobile */}
                  {expandedRows.includes(index) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-3">
                        {opportunity.programs && opportunity.programs.length ? (
                          opportunity.programs.map((program, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setSelectedManufacturer(opportunity);
                                setSelectedTierId(program.id);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-sm text-heading-color">
                                  {program.name}
                                </h4>
                                <span className="text-sm font-medium text-green">
                                  {isInternal && program.spiffEarning == 0
                                    ? "N/A"
                                    : `$${formatNumber(program.spiffEarning && program.spiffEarning > 0 ? program.spiffEarning : 0, false)}`}
                                </span>
                              </div>
                              <p className="text-xs text-heading-very-light mb-2">
                                {program.overview}
                              </p>
                              <div className="flex justify-between text-xs text-heading-very-light">
                                <span>
                                  Start:{" "}
                                  {getNumericDateString(
                                    program.startDate.toString()
                                  )}
                                </span>
                                <span>
                                  End:{" "}
                                  {getNumericDateString(
                                    program.endDate.toString()
                                  )}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 text-sm text-heading-very-light">
                            {MESSAGES.NO_RECORDS_FOUND}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-heading-very-light">
                {MESSAGES.NO_RECORDS_FOUND}
              </div>
            )}
          </div>
        </div>
      </Card>

      {selectedManufacturer && selectedTierId && (
        <SpiffTierDetailsModal
          manufacturerData={selectedManufacturer}
          programDetailId={selectedTierId}
          isOpen={true}
          setIsOpen={() => {
            setSelectedManufacturer(undefined);
            setSelectedTierId(null);
          }}
          storeId={storeId}
          isInternal={isInternal}
        />
      )}
    </>
  );
};

export default AllSPIFFOpportunities;
