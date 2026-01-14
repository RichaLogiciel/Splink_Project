// Import Core functionality/component
import React from "react";

// Import Util functions
import { getInitials } from "../../utils/helper";

import Image from "next/image";

// Create Type for this Component
import { Representative } from "../../types/StoreTypes";

interface AvatarProps {
  user: Representative;
  bold?: boolean;
  large?: boolean;
  imageClass?: string;
  center?: boolean;
  subText?: string;
  bgColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  large,
  bold,
  imageClass,
  center,
  subText,
  bgColor = "bg-light-green"
}) => {
  return (
    <div
      className={`flex gap-3 items-center ${center && "w-full text-center"}`}
    >
      <div
        className={`avatar ${large ? "w-9 h-9" : "w-8 h-8"} overflow-hidden flex justify-center items-center text-[10px] rounded-md ${imageClass} ${!user?.logo && !user?.avatar ? bgColor : ""}`}
      >
        {user?.avatar || user?.logo ? (
          // <Image
          //   className="w-full h-full object-fill"
          //   src={user?.avatar || user?.logo || ""}
          //   alt={`${user?.name}Avatar`}
          //   width={104}
          //   height={104}
          // />

          // eslint-disable-next-line @next/next/no-img-element
          <Image
            className="w-full h-full object-contain"
            src={user?.avatar || user?.logo || ""}
            alt={`${user?.name}Avatar`}
            width={104}
            height={104}
          />
        ) : (
          <span
            className={`${large && "text-lg"} ${bold ? "font-semibold" : "font-medium"} leading-[0]`}
          >
            {getInitials(user?.name || "")}
          </span>
        )}
      </div>
      <div className="flex flex-col items-start flex-1">
        <span
          className={`flex-1 ${bold ? "font-semibold" : "font-medium"} ${large && "text-lg"}`}
        >
          {user?.name}
        </span>
        {subText && (
          <p className="text-nowrap text-ellipsis text-[11px] font-medium text-green-600">
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};

export default Avatar;
