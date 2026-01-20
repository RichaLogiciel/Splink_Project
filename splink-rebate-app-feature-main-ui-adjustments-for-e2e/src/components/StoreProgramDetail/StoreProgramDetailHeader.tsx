"use client";

import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Image from "next/image";
import Link from "next/link";

interface StoreProgramDetailHeaderProps {
  manufacturer: {
    name?: string;
    avatar?: string;
    authorized?: boolean;
  };
  backUrl: string;
  warehouseFilter?: React.ReactNode;
}

const StoreProgramDetailHeader: React.FC<StoreProgramDetailHeaderProps> = ({
  manufacturer,
  backUrl,
  warehouseFilter
}) => {
  return (
    <div className="mb-4 flex sm:items-center justify-between flex-col sm:flex-row gap-4">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 w-full">
        <div className="flex items-center">
          <div className="icons flex">
            <Link prefetch className="w-6 items-center p-1.5" href={backUrl}>
              <Image
                src={leftArrowIcon.src}
                alt="leftArrowIcon"
                width={8}
                height={14}
              />
            </Link>
            <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
          </div>
          <ManufacturerAvatar
            large
            bold
            user={
              manufacturer ?? {
                name: "Store Program Details",
                avatar: ""
              }
            }
            imageClass="w-[48px] h-[48px]"
          />
        </div>
        {warehouseFilter}
      </div>
    </div>
  );
};

export default StoreProgramDetailHeader;
