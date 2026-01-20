// Default/Core Imports
import React from "react";

import Image from "next/image";
import Link from "next/link";

// Import Components
import ChangePasswordForm from "@/components/Form/ChangePasswordForm";

// Import Types
import { EditProfileType, UserType } from "@/types/AccountTypes";

// Import Images
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";

// Import API
import { APP_ROUTES } from "@/configs/routes";
// import { getUserServer } from "@/utils/getUserServer";
// import { fetchAccountData } from "../API";

export const dynamic = "force-dynamic";

const EditProfile: React.FC<EditProfileType> = async () => {
  // const userDetails = await fetchAccountData();
  // const userInfo = (userDetails?.data || {}) as UserType;
  // const user = getUserServer();

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
      <div className="rounded-lg bg-white p-7 sm:p-14 shadow-xl">
        <div className="max-w-[720px] mx-auto">
          <h2 className="mb-1 text-2xl font-semibold text-[#333]">
            Change Password
          </h2>
          <p className="text-sm">Change your account password.</p>
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
};

export default EditProfile;
