// Import Components
import TierAchievedCard from "@/components/Card/TierAchievedCard";
import TotalEstimatedSavingCard from "@/components/Card/TotalEstimatedSaving";
import DashboardCard from "@/components/Elements/DashboardCard";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import redAnnouncementIcon from "@/assets/icons/redAnnouncementIcon.svg";

// interface Link {
//   label: string;
//   href: string;
// }

// interface TotalSavingsCardData {
//   yoyValue: number;
//   info: string;
//   value: number;
//   footerInfo: string;
//   link: Link;
// }

// interface TotalManufacturer {
//   value: number;
// }

// interface TotalTier {
//   value: number;
// }

// interface TierAchievedData {
//   value: number;
// }

// interface KeyMetricsResponse {
//   status: string;
//   data: {
//     TotalSavingsCardData: TotalSavingsCardData;
//     TotalManufacturer: TotalManufacturer;
//     TotalTier: TotalTier;
//     TierAchievedData: TierAchievedData;
//   };
// }

const StoreDashboardCards = ({ data }: any) => {
  const calculatePercentage = (total: number, completed: number): number => {
    return parseInt(String(total > 0 ? (completed / total) * 100 : 0));
  };
  const {
    TotalSavingsCardData,
    TotalManufacturer,
    TotalTier,
    TierAchievedData
  } = data || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 mb-6">
      <div className=" col-span-1 md:col-span-2">
        <TotalEstimatedSavingCard
          fullWidth
          isFlexible={true}
          label="Sales"
          value={`$${formatNumber(TotalSavingsCardData?.value)}`}
          yoyValue={TotalSavingsCardData?.yoyValue}
          info={TotalSavingsCardData?.info}
          footerInfo={TotalSavingsCardData?.footerInfo}
          link={TotalSavingsCardData?.link}
        />
      </div>

      <DashboardCard
        fullWidth
        icon={redAnnouncementIcon.src}
        label="Manufacturer Partners"
        value={`${formatNumber(TotalManufacturer?.value)}`}
      />
      <TierAchievedCard
        fullWidth
        label="Tiers Achieved"
        percentage={calculatePercentage(
          TotalTier?.value,
          TierAchievedData?.value
        )}
        status={{ total: TotalTier?.value, completed: TierAchievedData?.value }}
      />
    </div>
  );
};

export default StoreDashboardCards;
