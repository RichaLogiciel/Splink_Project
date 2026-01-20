// Default/Core Imports
import nextDynamic from "next/dynamic";
import React from "react";

import Image from "next/image";
import Link from "next/link";

// Import Components
import EditProfileForm from "@/components/Form/EditProfile/EditProfileForm";

// Import Types
import { EditProfileType, UserType } from "@/types/AccountTypes";

// Import Images
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";

// Import API
import { APP_ROUTES } from "@/configs/routes";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributor,
  isManufacturerAdmin,
  isStore
} from "@/utils/rolesConditions";
import { fetchAccountData } from "../API";

const EditDistributorProfile = nextDynamic(
  () => import("@/components/Form/EditProfile/EditDistributorProfileForm"),
  { ssr: false }
);

const EditManufacturerProfile = nextDynamic(
  () => import("@/components/Form/EditProfile/EditManufacturerProfile"),
  { ssr: false }
);

export const dynamic = "force-dynamic";

const EditProfile: React.FC<EditProfileType> = async () => {
  const userDetails = await fetchAccountData();
  const userInfo = (userDetails?.data || {}) as UserType;
  const user = getUserServer();

  const getEditForm = () => {
    if (isDistributor(user.role) || isStore(user.role)) {
      return <EditDistributorProfile userInfo={userInfo} />;
    }

    if (isManufacturerAdmin(user.role)) {
      return <EditManufacturerProfile userInfo={userInfo} />;
    }

    return <EditProfileForm userInfo={userInfo} />;
  };

  return (
    <>
      <div className="mb-7">
        <div className="icons flex">
          <Link className="w-6 items-center p-1.5" href={APP_ROUTES.account}>
            <Image
              src={leftArrowIcon.src}
              alt="leftArrowIcon"
              width={8}
              height={14}
            />
          </Link>
          <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>
      </div>
      {getEditForm()}
    </>
  );
};

export default EditProfile;
