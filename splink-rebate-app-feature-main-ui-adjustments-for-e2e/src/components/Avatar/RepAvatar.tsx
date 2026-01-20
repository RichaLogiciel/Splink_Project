// Import Core functionality/component
import React from "react";
// import Image from "next/image";

// Import Util functions
import {
  // getInitials,
  // generateDarkColor
  getFullName
} from "../../utils/helper";

// Create Type for this Component
import { Representative } from "../../types/StoreTypes";

interface AvatarProps {
  user?: Representative;
  large?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ user }) => {
  const fullName = (user?.name ||
    getFullName(user?.firstName || "", user?.lastName || "")) as string;

  return (
    <div className="flex gap-3 items-center">
      {/* CURRENTLY HIDDEN AS CLIENT REQUIRED, MIGHT SHOW LATER WHEN USER UPLOAD IMAGES */}
      {/* <div
        className={`avatar min-w-6 ${large ? "w-9 h-9" : "w-6 h-6"} overflow-hidden flex justify-center items-center text-[10px] bg-light-green rounded-full`}
        style={{
          backgroundColor: user?.bgColor || generateDarkColor(),
          color: "white"
        }}
      >
        {user?.avatar ? (
          <Image
            className="w-full h-full object-cover"
            src={user?.avatar}
            alt={`${user?.name}Avatar`}
            width={24}
            height={24}
          />
        ) : (
          <span className={`font-medium leading-[1] ${large && "text-xs"}`}>
            {getInitials(fullName)}
          </span>
        )}
      </div> */}
      <span className="font-medium">{fullName}</span>
    </div>
  );
};

export default Avatar;
