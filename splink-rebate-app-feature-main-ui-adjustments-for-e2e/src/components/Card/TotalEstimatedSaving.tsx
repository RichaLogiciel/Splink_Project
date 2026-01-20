import Image from "next/image";

// Import Components
import Card from "../Card/";

// Import Images
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";

export interface TotalSavingsCardType {
  icon?: string;
  label: string;
  value: string;
  yoyLabel?: string;
  yoyValue?: number;
  fullWidth?: boolean;
  isFlexible?: boolean;
  info?: string;
  footerInfo?: string;
  link?: {
    label?: string;
    href?: string;
  };
}

// Import Images
import { dateFormatter } from "@/utils/helper";
import grayWatchIcon from "../../assets/icons/grayWatchIcon.svg";

function TotalEstimatedSavingCard({
  icon = greenDollarIcon.src,
  value,
  fullWidth,
  isFlexible = false
  // link,
  // footerInfo,
  // info
}: TotalSavingsCardType) {
  return (
    <Card
      className={`w-full h-full ${
        !fullWidth && " lg:w-[calc(50%-18px)]"
      } ${isFlexible ? "flex-1" : "flex-0"}`}
    >
      <div className="flex justify-between mb-1">
        <div className="flex gap-1.5 items-center">
          <Image src={icon} alt="Total Sales Icon" width={15} height={15} />
          <span className="text-sm font-small text-heading-light">
            Estimated Earnings
          </span>
        </div>
      </div>
      <div className="flex justify-between mb-1 items-center">
        <div
          className="text-m font-semibold"
          dangerouslySetInnerHTML={{ __html: value }}
        ></div>
      </div>
      <div className="flex justify-between mb-1 items-center">
        <div className="flex gap-1 text-xs">
          <Image
            src={grayWatchIcon.src}
            width={12}
            height={12}
            alt="watch icon"
          />
          Total amount through{" "}
          <span>{dateFormatter(new Date().toISOString())}</span>
        </div>
      </div>
    </Card>
  );
}

export default TotalEstimatedSavingCard;
