"use client";
// Import Core functionality/component
import React from "react";

// Import Util functions
import { MESSAGES } from "@/configs/messages";
import { useWindowWidth } from "@/utils/clientHelper";
import { SalesRepProgramTableType } from "../../types/ProgramTypes";

const SalesRepProgramTable: React.FC<SalesRepProgramTableType> = ({
  programs,
  id
}) => {
  const windowWidth = useWindowWidth();

  return (
    <div
      className="SalesRepProgram text-left text-filter-light font-normal font-inter mt-2"
      id={id}
    >
      {windowWidth > 640 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="font-normal min-w-24 px-2 sm:px-4">Type</th>
                <th className="font-normal min-w-20 px-2 sm:px-4">Rebate</th>
                <th className="font-normal min-w-64 px-2 sm:px-4">Overview</th>
                <th className="font-normal min-w-32 px-2 sm:px-4">
                  Start Date
                </th>
                <th className="font-normal min-w-32 px-2 sm:px-4">End Date</th>
              </tr>
            </thead>
            <tbody>
              {programs?.length > 0 ? (
                programs.map((program, index) => {
                  const isNonPayment = program.programType === "NA";
                  return (
                    <tr key={`${index}-${program.type}`} className="border-b">
                      <td className="px-2 sm:px-4 py-3">
                        {isNonPayment ? program.programName : program.type}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-green font-medium">
                        {isNonPayment ? "N/A" : program.rebate}
                      </td>
                      <td className="px-2 sm:px-4 py-3">{program.overview}</td>
                      <td className="px-2 sm:px-4 py-3">{program.startDate}</td>
                      <td className="px-2 sm:px-4 py-3">{program.endDate}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="pt-3" colSpan={5}>
                    <p className="text-center font-medium text-heading-very-light text-sm">
                      {MESSAGES.NO_RECORDS__FOUND}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sm:hidden my-4 pt-4 text-sm -mx-6 bg-common-bg  -mb-9">
          {programs?.length > 0 ? (
            programs.map((program, index) => {
              const isNonPayment = program.programType === "NA";
              return (
                <div
                  key={`mobile-${index}-${program.type}`}
                  className="shadow rounded-lg py-3 px-4 bg-white mb-3"
                >
                  <div className="flex gap-4 items-center justify-between font-medium">
                    <h4 className="text-base text-highlighted-color">
                      {isNonPayment ? program.programName : program.type}
                    </h4>
                    <div className="flex gap-2 min-w-36 justify-end">
                      {program.rebate && (
                        <p className="text-green">
                          Rebate: {isNonPayment ? "N/A" : program.rebate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 text-highlighted-color">
                    {program.overview}
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-4">
                    <div className="term">
                      <span className="text-filter-light text-xs font-medium">
                        Start Date
                      </span>
                      <p className="mt-1 text-highlighted-color font-semibold">
                        {program.startDate}
                      </p>
                    </div>
                    <div className="term">
                      <span className="text-filter-light text-xs font-medium">
                        End Date
                      </span>
                      <p className="mt-1 text-highlighted-color font-semibold">
                        {program.endDate}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center font-medium text-heading-very-light text-sm p-4">
              {MESSAGES.NO_RECORDS_FOUND}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesRepProgramTable;
