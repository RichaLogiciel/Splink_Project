"use client";

// Import Core functionality/component
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { showUserRole } from "@/components/Table/usersTableHelper";
import { USER_ROLES, USER_ROLES_INFO } from "@/configs/roles";

// Import Components
import Avatar from "@/components/Avatar/RepAvatar";
import Pagination from "./Pagination";

// Import Types
import { LoginResponseType, UsersListingApiResType } from "@/types/UsersType";

// Import Images
import dotsIcon from "@/assets/icons/3DotsIcon.svg";
import sortIcon from "@/assets/icons/sortIcon.svg";
import {
  printEmail,
  showEntityName,
  statusChip
} from "@/components/Table/usersTableHelper";
import { apiClient } from "@/lib/axiosClient";
import { loginAsUser } from "@/utils/getUserClient";
import { generateQueryString, isEmptyString } from "@/utils/helper";
import { isDistributorAdmin, isManufacturer } from "@/utils/rolesConditions";
import { toast } from "react-toastify";
import ConfirmationDialog from "../Dialog/ConfirmWishlistItemDelete";
import ReplaceEmailModal from "../Dialog/ReplaceEmailModal";

const StoreTable: React.FC<UsersListingApiResType> = ({
  users,
  currentPage,
  totalPages,
  totalRes,
  userType = ""
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const [sort, setSort] = useState<string>(params.get("sort") ?? "ASC");
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [isOpenReplaceEmailModal, setIsOpenReplaceEmailModal] = useState(false);
  const [oldEmail, setOldEmail] = useState("");
  const [isOpenViewAsUserModel, setIsOpenViewAsUserModel] = useState(false);
  const [userID, setUserID] = useState<number>(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Type assertion to ensure event.target is treated as an Element
      const target = event.target as Element;

      // Check if the click is outside the dropdown and the icon button
      if (
        dropdownRef.current &&
        target.tagName != "TD" &&
        target.tagName != "IMG"
      )
        setOpenDropdown(null); // Close the dropdown
    };
    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const openReplaceEmailModal = (email: string) => {
    setOldEmail(email);
    setIsOpenReplaceEmailModal(true);
  };

  const toggleDropdown = (index: number) => () => {
    setOpenDropdown((prev) => (prev === index ? null : index));
  };

  const openImpersonateModel = (userID: number) => () => {
    if (!userID) {
      toast.error("Unable to find User ID.");
      return;
    }

    setUserID(userID);
    setIsOpenViewAsUserModel(true);
  };

  const handleSortChange = () => {
    const sortVal = sort === "ASC" ? "DESC" : "ASC";

    setSort(sortVal);

    const updatedQuery = generateQueryString(params, {
      sort: sortVal,
      page: 1,
      s: params.get("s")
    });

    router.push(`${location.pathname}?${updatedQuery}`);
  };

  const handlePageChange = (page: number) => {
    if (currentPage !== page && page <= totalPages) {
      const querString = generateQueryString(params, {
        sort: params.get("sort"),
        s: params.get("s"),
        page: page
      });

      // Push the search query to the router
      router.push(`${location.pathname}?${querString}`);
    }
  };

  const handleUserImpersonate = async () => {
    if (!userID) {
      toast.error("Unable to find User ID.");
      return;
    }

    try {
      const { data }: LoginResponseType = await apiClient.post(
        "/auth/loginas/" + userID
      );

      loginAsUser(data);
    } catch (error: any) {
      toast.error(error?.data || "Unable to Impersonation User");
    } finally {
      setIsOpenViewAsUserModel(false);
    }
  };

  const resStartNum =
    currentPage == 1 ? currentPage : 10 * (currentPage - 1) + 1;

  const resEndNum = currentPage * 10 > totalRes ? totalRes : currentPage * 10;

  return (
    <>
      <div className="storeTable text-left text-sm text-filter-light font-medium font-inter relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th
                  className="font-semibold px-2 sm:px-4 cursor-pointer min-w-60"
                  onClick={handleSortChange}
                >
                  <span className="inline mr-2">Person Name</span>
                  <Image
                    className={`storeSortIcon inline ${sort == "DESC" && "rotate-180"}`}
                    src={sortIcon.src}
                    alt="sort icon"
                    width={7}
                    height={10}
                  />
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-56">
                  Entity Name
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-40">
                  Entity Type
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-40">
                  Parent Entity
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-40">Role</th>
                <th className="font-semibold px-2 sm:px-4 min-w-56">Email</th>
                <th className="font-semibold px-2 sm:px-4 min-w-48">
                  Phone Number
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-48">Status</th>
                <th className="font-semibold px-2 sm:px-4 min-w-16 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.length > 0 ? (
                users.map((user, index) => (
                  <tr
                    key={`${index}-${user.id}`}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-2 sm:px-4 py-4">
                      {user.firstName && (
                        <Avatar
                          large
                          user={{
                            firstName: user.firstName,
                            lastName: user.lastName
                          }}
                        />
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-4">
                      {showEntityName(user, user?.UserRole?.role)}

                      {user?.UserRole?.role === USER_ROLES.STORE &&
                        user.UserRole.AssociatedStore?.externalStoreId &&
                        !isEmptyString(
                          user.UserRole.AssociatedStore
                            ?.externalStoreId as string
                        ) && (
                          <span className="block text-xs text-heading-very-light font-medium">
                            {user.UserRole.AssociatedStore?.externalStoreId}
                          </span>
                        )}
                    </td>
                    <td className="px-2 sm:px-4 py-4">
                      {
                        USER_ROLES_INFO[
                          user?.UserRole?.associated_entity_type || ""
                        ]
                      }
                    </td>
                    <td className="px-2 sm:px-4 py-4">
                      {user?.UserRole?.ParentUserRole?.[
                        [USER_ROLES.MANUFACTURER_EXECUTIVE].includes(userType)
                          ? "AssociatedManufacturer"
                          : "AssociatedDistributor"
                      ]?.organizationName || "N/A"}
                    </td>
                    <td className="px-2 sm:px-4 py-4">
                      {showUserRole(user?.UserRole?.role)}
                    </td>
                    <td className="px-2 sm:px-4 py-4">
                      {printEmail(user.status, user.email)}
                    </td>
                    <td className="px-2 sm:px-4 py-4">{user.phone}</td>
                    <td className="px-2 sm:px-4 py-4">
                      {statusChip(user.status)}
                    </td>
                    <td
                      id="action-icon"
                      className="px-2 sm:px-4 py-4 text-center"
                      onClick={toggleDropdown(index)}
                    >
                      <Image
                        className="inline-block"
                        alt="Action Icon"
                        width={16}
                        height={2}
                        src={dotsIcon.src}
                      />
                      {/* Dropdown Menu */}
                      {openDropdown === index && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-6 mt-2 w-48 bg-white border rounded shadow-lg z-10 cursor-default"
                        >
                          <ul className="py-1 rounded-md bg-white shadow-md text-sm text-left">
                            {(isDistributorAdmin(user?.UserRole?.role) ||
                              isManufacturer(user?.UserRole?.role)) && (
                              <li
                                className="cursor-pointer select-none px-4 py-2 relative hover:bg-gray-100"
                                onClick={() => {
                                  openReplaceEmailModal(user.email);
                                }}
                              >
                                Replace Email
                              </li>
                            )}
                            <li
                              id="impersonate-user"
                              className="cursor-pointer select-none px-4 py-2 relative hover:bg-gray-100"
                              onClick={openImpersonateModel(user.id)}
                            >
                              View User Experience
                            </li>
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b">
                  <td className="px-2 sm:px-4 py-4" colSpan={5}>
                    <p className="text-center">
                      We couldn&apos;t find any users data at this moment.
                      Please check back later or try modifying your search
                      criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {users?.length > 0 && (
          <div className="table-footer mt-10 mb-3">
            <div className="flex gap-4 justify-between items-center flex-col sm:flex-row">
              <span className="font-light">
                Showing
                <strong className="font-medium">
                  {` ${resStartNum} - ${resEndNum}`} of {totalRes}
                </strong>
              </span>
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
      <ReplaceEmailModal
        isOpen={isOpenReplaceEmailModal}
        setIsOpen={setIsOpenReplaceEmailModal}
        oldEmail={oldEmail}
      />
      <ConfirmationDialog
        isOpen={isOpenViewAsUserModel}
        title="Confirm User Impersonation"
        message="You are about to view the system as this user. This action will switch your session to simulate the user's experience. Do you want to proceed?"
        onClose={() => setIsOpenViewAsUserModel(false)}
        onConfirm={handleUserImpersonate}
      />
    </>
  );
};

export default StoreTable;
