// Import Core or Packages
import React from "react";

// Import Component
import FinanceAccordion from "@/components/Accordion/FinanceAccordion";
import FinancePaymentCard from "@/components/Card/FinancePaymentCard";
import FinanceSummaryCard from "@/components/Card/FinanceSummaryCard";
import FinancePaymentHistoryCard from "@/components/Card/FinancePaymentHistoryCard";

// Import Types
import { FinancePageProps } from "@/types/FinanceTypes";

// Import Mock Data
import pageData from "@/mocks/finance/page.json";

const FinancePage: React.FC<FinancePageProps> = () => {
  return (
    <>
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold text-highlighted-color">
        Finance
      </h2>
      <div className="grid mt-8 grid-col-[300px] gap-6">
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          <FinanceSummaryCard
            title={pageData.financeSummaryCard.title}
            options={pageData.financeSummaryCard.options}
            total={pageData.financeSummaryCard.total}
          />
        </div>
        <FinancePaymentCard options={pageData.financePaymentCard.options} />
        <FinancePaymentHistoryCard
          history={pageData.financePaymentHistoryCard.history}
        />
      </div>
      <div className="mt-6">
        <h2 className="mb-4 sm:mb-6 text-lg font-semibold text-highlighted-color">
          All Statements
        </h2>

        <FinanceAccordion items={pageData.accordionItems} />
      </div>
    </>
  );
};

export default FinancePage;
