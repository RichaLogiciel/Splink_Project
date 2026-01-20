"use client";

import GenerateCsvBtn from "@/components/Elements/GenerateCsvBtn";
import { exportVoidFillSummaryCSV } from "@/utils/csvExport";

interface VoidFillCSVButtonProps {
  manufacturerId: number;
  manufacturerName: string;
}

const VoidFillCSVButton: React.FC<VoidFillCSVButtonProps> = ({
  manufacturerId,
  manufacturerName
}) => {
  const handleGenerateCSV = async () => {
    try {
      await exportVoidFillSummaryCSV({
        manufacturerId,
        manufacturerName
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      // Error handling is done in exportVoidFillSummaryCSV
    }
  };

  return (
    <GenerateCsvBtn
      reportTypes={[{ value: "VOID_FILL_SUMMARY", label: "Void Fill Summary" }]}
      onClickHandler={handleGenerateCSV}
    />
  );
};

export default VoidFillCSVButton;
