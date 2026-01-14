import { USER_ROLES, USER_ROLES_INFO } from "@/configs/roles";
import { USER_STATUS } from "@/configs/status";
import { User } from "@/types/UsersType";
import React from "react";

export const statusChip = (userStatus: string | null): React.ReactElement => {
  const status = userStatus ? userStatus : "Active";
  const statusStr = status.toLocaleLowerCase();
  // eslint-disable-next-line react-hooks/rules-of-hooks

  if (["active", USER_STATUS.CHAIN_ACTIVE.toLowerCase()].includes(statusStr)) {
    return (
      <span className="text-xs inline-block py-1.5 px-3 text-[#068458] bg-[#008355] bg-opacity-20 rounded">
        {USER_STATUS.CHAIN_ACTIVE
          ? USER_STATUS.ACTIVE.replace("_", "")
          : status}
      </span>
    );
  }
  if (status === USER_STATUS.INVITATION_PENDING) {
    return (
      <span className="text-xs inline-block py-1.5 px-3 text-[#B7931E] bg-[#836F00] bg-opacity-20 rounded">
        INVITATION NOT SENT
      </span>
    );
  }
  if (
    [USER_STATUS.INVITATION_SENT, USER_STATUS.CHAIN_INVITATION_SENT].includes(
      status
    )
  ) {
    return (
      <span className="text-xs inline-block py-1.5 px-3 text-[#B7931E] bg-[#836F0033] bg-opacity-20 rounded">
        {USER_STATUS.INVITATION_PENDING?.replace("_", " ")}
      </span>
    );
  }

  return (
    <span className="text-xs inline-block py-1.5 px-3 rounded">{status}</span>
  );
};

export const printEmail = (
  userStatus: string | null,
  email: string
): React.ReactElement => {
  if (
    userStatus === USER_STATUS.INVITATION_SENT ||
    userStatus === USER_STATUS.INVITATION_PENDING
  ) {
    return <span className="opacity-60">{email}</span>;
  }

  return <span className="">{email}</span>;
};

export const showEntityName = (user: User, userRole: string | undefined) => {
  if (!userRole) return "";

  switch (userRole) {
    case USER_ROLES.MANUFACTURER:
      return user.UserRole.AssociatedManufacturer?.organizationName;

    case USER_ROLES.DISTRIBUTOR:
    case USER_ROLES.DISTRIBUTOR_ADMIN:
      return (
        user.UserRole.AssociatedDistributor?.organizationName ||
        user.UserRole.AssociatedDistributor?.name ||
        ""
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
      return (
        user.UserRole.ParentDistributor?.organizationName ||
        user.UserRole.ParentDistributor?.name ||
        ""
      );

    case USER_ROLES.STORE:
      return user.UserRole.AssociatedStore?.store_name;

    default:
      return "";
  }
};

export const showUserRole = (role: string) => {
  const userRole = USER_ROLES_INFO[role];

  return role == USER_ROLES.DISTRIBUTOR_ADMIN || role == USER_ROLES.STORE
    ? `${userRole} Admin`
    : userRole;
};
