"use client";
// Core|Package imports
import Image from "next/image";
import { useState } from "react";

// Import components
import CardButton from "../CardButton";
import InviteNewUserModal from "../Dialog/InviteNewUserModal";

// Imported Images
import AddIcon from "../../assets/icons/plusWhiteIcon.svg";

import { USER_ROLES } from "@/configs/roles";
import {
  ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS,
  MANUFACTURER_AM_INVITE_ENABLED,
  SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import {
  isDistributorFeatureEnabled,
  isWarehouseFeatureEnabled
} from "@/utils/helper";

interface AddNewUserProps {
  role: string;
  parentEntityId?: number;
}

const getUserRolesToInvite = (role: string, parentEntityId?: number) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return [
        { value: USER_ROLES.DISTRIBUTOR_ADMIN, label: "Distributor" },
        { value: USER_ROLES.MANUFACTURER, label: "Manufacturer" }
      ];

    case USER_ROLES.DISTRIBUTOR_ADMIN: {
      const canInviteGeneralManager = isWarehouseFeatureEnabled(parentEntityId);
      const canInviteSalesManager =
        ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS &&
        isDistributorFeatureEnabled(
          parentEntityId ?? null,
          SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
        );

      const baseRoles = [
        { value: USER_ROLES.DISTRIBUTOR_EXECUTIVE, label: "Executive" },
        { value: USER_ROLES.DISTRIBUTOR_SALES_REP, label: "Sales Rep" }
      ];

      return [
        ...baseRoles,
        ...(canInviteGeneralManager
          ? [
              {
                value: USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER,
                label: "General Manager"
              }
            ]
          : []),
        ...(canInviteSalesManager
          ? [
              {
                value: USER_ROLES.DISTRIBUTOR_SALES_MANAGER,
                label: "Sales Rep Manager"
              }
            ]
          : [])
      ];
    }

    case USER_ROLES.MANUFACTURER:
      return MANUFACTURER_AM_INVITE_ENABLED
        ? [
            { value: USER_ROLES.MANUFACTURER_EXECUTIVE, label: "Executive" },
            {
              value: USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER,
              label: "Account Manager"
            }
          ]
        : [{ value: USER_ROLES.MANUFACTURER_EXECUTIVE, label: "Executive" }];

    case USER_ROLES.DISTRIBUTOR_EXECUTIVE: {
      const canInviteGeneralManager = isWarehouseFeatureEnabled(parentEntityId);
      const canInviteSalesManager =
        ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS &&
        isDistributorFeatureEnabled(
          parentEntityId ?? null,
          SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
        );

      const baseRoles = [
        { value: USER_ROLES.DISTRIBUTOR_SALES_REP, label: "Sales Rep" }
      ];

      return [
        ...baseRoles,
        ...(canInviteGeneralManager
          ? [
              {
                value: USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER,
                label: "General Manager"
              }
            ]
          : []),
        ...(canInviteSalesManager
          ? [
              {
                value: USER_ROLES.DISTRIBUTOR_SALES_MANAGER,
                label: "Sales Rep Manager"
              }
            ]
          : [])
      ];
    }

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
    case USER_ROLES.STORE:
    default:
      return [];
  }
};

export default function AddNewUser({ role, parentEntityId }: AddNewUserProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openPopup = () => setIsOpen(true);

  const rolesToInvite = getUserRolesToInvite(role, parentEntityId);

  if (!rolesToInvite.length) return null;

  return (
    <>
      <CardButton
        onClick={openPopup}
        className="border border-border-gray bg-green min-w-28"
      >
        <div className="flex gap-2 justify-center">
          <Image
            height={13.5}
            width={15}
            src={AddIcon.src}
            alt="Download Icon"
          />
          <div className="text-white">Add User</div>
        </div>
      </CardButton>
      <InviteNewUserModal
        rolesToInvite={rolesToInvite}
        role={role}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </>
  );
}
