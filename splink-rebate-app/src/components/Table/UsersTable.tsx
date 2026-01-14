"use client";

// Import Core functionality/component
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { USER_ROLES, USER_ROLES_INFO } from "@/configs/roles";
import { USER_STATUS } from "@/configs/status";

// Import Components
import Avatar from "@/components/Avatar/RepAvatar";
import Pagination from "./Pagination";

// Import Types
import { User, UsersListingApiResType } from "@/types/UsersType";

// Import Images
import { cancelUserInvite } from "@/app/app/users/API";
import dotsIcon from "@/assets/icons/3DotsIcon.svg";
import sortIcon from "@/assets/icons/sortIcon.svg";
import ConfirmWishlistItemDelete from "@/components/Dialog/ConfirmWishlistItemDelete";
import { printEmail, statusChip } from "@/components/Table/usersTableHelper";
import { getUserClient } from "@/utils/getUserClient";
import { generateQueryString } from "@/utils/helper";
import { toast } from "react-toastify";
import AccountManagesDistributorsModal from "../Dialog/AccountManagesDistributorsModal";
import DistributorWarehouseManageModal from "../Dialog/DistributorWarehouseManageModal";
import InviteNewSalesRepModal from "../Dialog/InviteNewSalesRepModal";

const StoreTable: React.FC<UsersListingApiResType> = ({
  canInvite = false,
  users,
  currentPage,
  totalPages,
  totalRes
}) => {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // State to manage modal visibility
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectAccountManager, setSelectAccountManager] = useState<User | null>(
    null
  );
  const [selectGeneralManager, setSelectGeneralManager] = useState<User | null>(
    null
  );
  const [userIndex, setUserIndex] = useState<number>(-1);
  const [sort, setSort] = useState<string>(params.get("sort") ?? "ASC");

  const loggedInUser = getUserClient();

  // Toggles the dropdown for the given index
  const toggleDropdown = (index: number) => () => {
    setOpenDropdown((prev) => (prev === index ? null : index));
  };

  const handleInviteClick = (index: number) => () => {
    setUserIndex(index);
    setIsModalOpen(!isModalOpen);
  };

  const onInvitationSent = () => {
    if (users[userIndex]?.status) {
      users[userIndex].status = USER_STATUS.INVITATION_SENT;
    }

    setIsModalOpen(false);
  };

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

  const handleInviteCancel = (index: number) => () => {
    setUserIndex(index);
    setIsDeleteModalOpen(true);
  };

  const handleUserActionClick = (user: User) => {
    if (user?.UserRole?.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER) {
      setSelectAccountManager((prev) =>
        prev && prev.id === user.id ? null : user
      );
    }
    if (user?.UserRole?.role == USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER) {
      setSelectGeneralManager((prev) =>
        prev && prev.id === user.id ? null : user
      );
    }
  };

  const onCancelInviteConfirm = async () => {
    if (userIndex != -1) {
      try {
        const userId = users[userIndex].id;
        const res = await cancelUserInvite(userId);

        toast.success(
          res?.message || "Invitations have been successfully canceled."
        );
        router.refresh();
      } catch (error: any) {
        toast.error(
          error?.message ||
            "Unable to cancel the invitation. Please try again later."
        );
      }

      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleteModalOpen(false);
    toast.error(
      "User Information Retrieval Failed for Invitation Cancellation."
    );
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

  const isActiveStatus = (status: string | null) => {
    // Show emails for both ACTIVE and INVITATION_PENDING users
    // so distributor admins can see pending invite emails
    return (
      status == USER_STATUS.ACTIVE || status == USER_STATUS.INVITATION_PENDING
    );
  };

  const resStartNum =
    currentPage == 1 ? currentPage : 10 * (currentPage - 1) + 1;

  const resEndNum = currentPage * 10 > totalRes ? totalRes : currentPage * 10;

  return (
    <div className="storeTable text-left text-sm text-filter-light font-medium font-inter relative">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="h-11 border-b text-heading-very-light text-xs">
            <tr>
              <th
                className="font-semibold px-2 sm:px-4 cursor-pointer min-w-60"
                onClick={handleSortChange}
              >
                <span className="inline mr-2">Name</span>
                <Image
                  className={`storeSortIcon inline ${sort == "DESC" && "rotate-180"}`}
                  src={sortIcon.src}
                  alt="sort icon"
                  width={7}
                  height={10}
                />
              </th>
              <th className="font-semibold px-2 sm:px-4 min-w-56">Email</th>
              <th className="font-semibold px-2 sm:px-4 min-w-48">
                Phone Number
              </th>
              <th className="font-semibold px-2 sm:px-4 min-w-56">Role</th>
              <th className="font-semibold px-2 sm:px-4 min-w-32">Status</th>
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
                    {isActiveStatus(user.status) &&
                      printEmail(user.status, user.email)}
                  </td>
                  <td className="px-2 sm:px-4 py-4">
                    {isActiveStatus(user.status) && user.phone}
                  </td>
                  <td className="px-2 sm:px-4 py-4">
                    {USER_ROLES_INFO[user?.UserRole?.role]}
                  </td>
                  <td className="px-2 sm:px-4 py-4">
                    {user.status == USER_STATUS.INVITATION_PENDING &&
                    canInvite ? (
                      <button
                        className={`w-14 rounded outline-none text-center py-2 bg-green hover:bg-opacity-90 text-white text-xs`}
                        disabled={user.status != USER_STATUS.INVITATION_PENDING}
                        onClick={handleInviteClick(index)}
                      >
                        Invite
                      </button>
                    ) : (
                      statusChip(user.status)
                    )}
                  </td>
                  <td
                    className="px-2 sm:px-4 py-4 text-center"
                    onClick={toggleDropdown(index)}
                  >
                    <UserActionButton
                      user={user}
                      handleClick={() => {
                        handleUserActionClick(user);
                      }}
                    />

                    {/* Dropdown Menu */}
                    {openDropdown === index && canInvite && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 cursor-default"
                      >
                        <ul className="py-1">
                          <li className="px-4 py-2">
                            {(user.status === USER_STATUS.INVITATION_PENDING ||
                              user.status === USER_STATUS.ACTIVE) && (
                              <span className="text-heading-very-light">
                                No actions available at the moment
                              </span>
                            )}

                            {/* Show Cancel button only when Invitation sent */}
                            {user.status == USER_STATUS.INVITATION_SENT && (
                              <button
                                className="w-full py-2 bg-danger hover:opacity-90 text-white"
                                onClick={handleInviteCancel(index)}
                              >
                                Cancel
                              </button>
                            )}
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
                    We couldn&apos;t find any users data at this moment. Please
                    check back later or try modifying your search criteria.
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
      <InviteNewSalesRepModal
        isOpen={isModalOpen}
        user={users[userIndex]}
        onSuccess={onInvitationSent}
        onClose={(val: boolean) => setIsModalOpen(val)}
      />
      <AccountManagesDistributorsModal
        isOpen={selectAccountManager ? true : false}
        user={selectAccountManager}
        onClose={() => {
          setSelectAccountManager(null);
        }}
      />
      <DistributorWarehouseManageModal
        isOpen={selectGeneralManager ? true : false}
        user={selectGeneralManager}
        onClose={() => {
          setSelectGeneralManager(null);
        }}
      />
      <ConfirmWishlistItemDelete
        title="Confirm Invitation Cancellation"
        message="Are you sure you want to cancel this invitation?"
        isOpen={isDeleteModalOpen}
        onConfirm={onCancelInviteConfirm}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

const UserActionButton = ({
  user,
  handleClick = () => {}
}: {
  user: User;
  handleClick: () => void;
}) => {
  const isActive = user?.status === USER_STATUS.ACTIVE;

  const role = user?.UserRole?.role;

  const actionsByRole: any = {
    [USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER]: {
      label: "Manage Distributors",
      onClick: () => handleClick(),
      show: isActive
    },
    [USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER]: {
      label: "Manage Warehouses",
      onClick: () => handleClick(),
      show: isActive
    }
    // Add more roles here as needed
  };

  const action = actionsByRole[role];

  if (action?.show) {
    return (
      <div className="w-full flex justify-center">
        <button
          className="bg-green h-full rounded py-1 px-2 flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      </div>
    );
  }

  return (
    <Image
      className="inline-block"
      alt="Action Icon"
      width={16}
      height={2}
      src={dotsIcon.src}
    />
  );
};

export default StoreTable;
