"use client";

import React from "react";
import DistributorAdminProgramsTable from "@/components/Table/DistributorAdminProgramsTable";

interface DistributorAdminProgramsViewProps {
  searchParams?: {
    participantType?: "SALES_REP" | "DISTRIBUTOR" | "STORE";
    manufacturerName?: string;
    startDate?: string;
    endDate?: string;
  };
  userRole?: string;
}

const DistributorAdminProgramsView: React.FC<
  DistributorAdminProgramsViewProps
> = ({ searchParams, userRole }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Distributor Admin Programs
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage all programs in the system with advanced filtering
            options.
          </p>
        </div>

        {/* Programs Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <DistributorAdminProgramsTable searchParams={searchParams} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorAdminProgramsView;
