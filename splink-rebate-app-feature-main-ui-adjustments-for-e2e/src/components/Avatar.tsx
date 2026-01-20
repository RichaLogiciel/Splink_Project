// Import Core functionality/component
import React from "react";
// import Image from "next/image";

// Import Util functions
// import { getInitials } from "../utils/helper";

// Create Type for this Component
import { Representative } from "../types/StoreTypes";
interface AvatarProps {
  user: Representative;
}

const Avatar: React.FC<AvatarProps> = ({ user }) => {
  return (
    <div className="flex gap-3 items-center">
      {/* CURRENTLY HIDDEN AS CLIENT REQUIRED, MIGHT SHOW LATER WHEN USER UPLOAD IMAGES */}
      {/* <div className="avatar w-6 h-6 overflow-hidden flex justify-center items-center text-[10px] bg-light-green rounded-full">
        {user?.avatar ? (
          <Image
            className="w-full"
            src={user?.avatar}
            alt={`${user?.name}Avatar`}
            width={24}
            height={24}
          />
        ) : (
          <span className="font-medium leading-none">
            {getInitials(user?.name || "")}
          </span>
        )}
      </div> */}
      <span className="font-medium">{user?.name}</span>
    </div>
  );
};

export default Avatar;
