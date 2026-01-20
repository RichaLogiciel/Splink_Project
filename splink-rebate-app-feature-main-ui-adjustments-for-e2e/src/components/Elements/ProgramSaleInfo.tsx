import EstimatedSavingsWarningPopOver from "@/components/Popovers/EstimatedSavingsWarning";

interface ProgramSaleInfoType {
  purchaseVolume?: string;
  totalSavings?: string;
  purchaseLabel?: string;
  savingLabel?: string;
  savingOpportunityLabel?: string;
  totalSavingsOpportunity?: string;
  showEstimatedWarning?: boolean;
  showEstimatedEarnings?: boolean;
  showSavingsNotApplicable?: boolean;
  hidePurchaseVolume?: boolean;
}

function ProgramSaleInfo({
  purchaseVolume,
  totalSavings,
  purchaseLabel,
  savingLabel,
  showEstimatedWarning,
  savingOpportunityLabel,
  totalSavingsOpportunity,
  showEstimatedEarnings = true,
  showSavingsNotApplicable,
  hidePurchaseVolume = false
}: ProgramSaleInfoType) {
  return (
    <div className="saleinfo bg-blue-bg py-2 px-4 mt-4 rounded-md flex gap-4 items-center text-heading-blue">
      {purchaseVolume && !hidePurchaseVolume && (
        <div id="purchase-volume-container" className="info w-1/2">
          <div className="text-xs">{purchaseLabel || "Purchase Volume"}</div>
          <span className="mt-1 block font-semibold">${purchaseVolume}</span>
        </div>
      )}
      {totalSavings && purchaseVolume && !hidePurchaseVolume && (
        <div className="seperator min-h-9 w-[1px] bg-info-0"></div>
      )}
      {totalSavings && showEstimatedEarnings && savingLabel && (
        <div
          id="savings-container"
          className={`${hidePurchaseVolume ? "w-full" : "w-1/2"} info`}
        >
          <div className="text-xs">{savingLabel || "Estimated Earnings"}</div>
          {showEstimatedWarning && !showSavingsNotApplicable ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="block font-semibold">${totalSavings}</span>
              <EstimatedSavingsWarningPopOver startFromLeft />
            </div>
          ) : (
            <span className="mt-1 block font-semibold">
              {showSavingsNotApplicable ? "NA" : `$${totalSavings}`}
            </span>
          )}
        </div>
      )}
      {totalSavings && totalSavingsOpportunity && (
        <div className="seperator min-h-9 w-[1px] bg-info-0"></div>
      )}
      {totalSavingsOpportunity && (
        <div id="savings-opp-container" className="info w-1/2">
          <div className="text-xs">
            {savingOpportunityLabel || "Earnings Opp."}
          </div>
          <span className="mt-1 block font-semibold">
            ${totalSavingsOpportunity}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgramSaleInfo;
