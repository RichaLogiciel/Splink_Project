// Default/Core Imports
import Image from "next/image";
import Link from "next/link";

// Import Types
import { AccountPageType, UserType } from "@/types/AccountTypes";

// Import API
import { APP_ROUTES } from "@/configs/routes";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributorAdmin,
  isStore,
  isSuperAdmin
} from "@/utils/rolesConditions";
import { NextPage } from "next";
import { fetchAccountData } from "./API";

import { USER_ROLES } from "@/configs/roles";

export const dynamic = "force-dynamic";

const AccountPage: NextPage<AccountPageType> = async () => {
  const userDetails = await fetchAccountData();

  const userInfo = (userDetails?.data as UserType) || {};

  const name = `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim();

  let address = "";
  address = formAddress(userInfo);

  function formAddress(userInfo: UserType): string {
    const addressParts = [
      userInfo.address,
      userInfo.state,
      userInfo.city,
      userInfo.zip
    ];

    return addressParts.filter(Boolean).join(", ");
  }
  const user = await getUserServer();
  let entityName = "";
  switch (user.role) {
    case USER_ROLES.STORE:
      entityName = userInfo.storeName ?? "";
      break;
    case USER_ROLES.CHAIN_ADMIN:
      entityName = userInfo.chainName ?? "";
      break;
    default:
      entityName = userInfo.distributorName ?? "";
      break;
  }
  return (
    <>
      <h1 className="mb-7 text-lg font-semibold">Account Settings</h1>
      <div className="shadow-sm p-4 bg-white rounded">
        <div className="pb-4 min-h-[86px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3 sm:items-center">
          <p className="title font-semibold text-base">Profile</p>
          <div className="flex items-center gap-4">
            {name && (
              <>
                <h4 className="font-semibold text-lg">{name}</h4>
              </>
            )}
          </div>
          <div className="flex sm:justify-end gap-4">
            <Link
              className="w-auto rounded border text-filter-light border-border-gray text-sm font-medium py-2 px-3 hover:bg-border-gray"
              href={APP_ROUTES.editProfile}
            >
              Edit profile
            </Link>
            <Link
              className="w-auto rounded border text-filter-light border-border-gray text-sm font-medium py-2 px-3 hover:bg-border-gray"
              href={APP_ROUTES.changePassword}
            >
              Change Password
            </Link>
          </div>
        </div>

        {user && !isSuperAdmin(user.role) && (
          <div className="pb-4 min-h-[86px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3 sm:items-center">
            <p className="title font-semibold text-base">
              {isStore(user.role) ? "Store Name" : "Organization"}
            </p>
            <div className="flex items-center gap-4 col-span-2">
              {userInfo?.logo && (
                <Image
                  className="inline-block w-auto max-h-16 max-w-48"
                  src={userInfo.logo}
                  height={59}
                  width={150}
                  alt="Logo"
                />
              )}
              <h4 className="font-semibold text-lg">{entityName}</h4>
            </div>
          </div>
        )}

        <div className="pb-4 min-h-[86px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3">
          <p className="title font-semibold text-base">Location</p>
          <div className="info col-span-2">
            <div
              className={`address ${
                address && address != " "
                  ? "mb-6 text-filter-light"
                  : "mb-3 text-filter-light/70"
              }`}
            >
              <p className="text-base">
                {address && address != " " ? (
                  address
                ) : (
                  <span className="text-xs">
                    Address not found! Please add one to keep your profile
                    up-to-date.
                  </span>
                )}
              </p>
            </div>
            {(isStore(user?.role) || isDistributorAdmin(user?.role)) && (
              <Link
                className="inline-block w-auto rounded border text-filter-light border-border-gray text-sm font-medium py-2 px-3 hover:bg-border-gray"
                href={APP_ROUTES.editProfile}
              >
                Add Address
              </Link>
            )}
          </div>
        </div>

        <div className="pb-4 min-h-[70px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3">
          <p className="title font-semibold text-base">Email Address</p>
          <div className="info col-span-2">
            <div className="emails mb-6">
              <p className="text-base text-filter-light mb-3">
                {userInfo.email}{" "}
                <span className="ml-3 font-medium bg-common-bg border-border-gray border px-3 py-1 rounded text-sm">
                  Primary
                </span>
              </p>
            </div>
            {/* <Link
              className="inline-block w-auto rounded border text-filter-light border-border-gray text-sm font-medium py-2 px-3 hover:bg-border-gray"
              href={APP_ROUTES.editProfile}
            >
              Add Email Address
            </Link> */}
          </div>
        </div>

        <div className="min-h-[86px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3">
          <p className="title font-semibold text-base">Phone Number</p>
          <div className="info col-span-2">
            {(userInfo.phone || userInfo.secondaryPhone) && (
              <div className="phones mb-6">
                {userInfo.phone && (
                  <p className="text-base text-filter-light mb-3">
                    {userInfo.phone}
                    <span className="ml-3 font-medium bg-common-bg border-border-gray border px-3 py-1 rounded text-sm">
                      Primary
                    </span>
                  </p>
                )}
                {userInfo.secondaryPhone && (
                  <p className="text-base text-filter-light mb-3">
                    {userInfo.secondaryPhone}
                  </p>
                )}
              </div>
            )}
            <Link
              className="inline-block w-auto rounded border text-filter-light border-border-gray text-sm font-medium py-2 px-3 hover:bg-border-gray"
              href={APP_ROUTES.editProfile}
            >
              {userInfo.phone && userInfo.secondaryPhone ? "Edit" : "Add"} Phone
              Number
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountPage;
