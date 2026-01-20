export const dynamic = "force-dynamic";

import AddUser from "@/components/Buttons/AddNewUser";
import Card from "@/components/Card";
import UserRoleDropdown from "@/components/Form/UserRoleDropdown";
import UserStatusDropdown from "@/components/Form/UserStatusDropdown";
import NoAccess from "@/components/NoAccess";
import SearchField from "@/components/SearchField";
import SuperAdminUsersTable from "@/components/Table/SuperAdminUsersTable";
import UsersTable from "@/components/Table/UsersTable";
import { apiServerClient } from "@/lib/axiosServer";
import { UsersPageProps } from "@/types/UsersType";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorExecutive,
  isManufacturer,
  isManufacturerAdminAndExecutive,
  isSuperAdmin
} from "@/utils/rolesConditions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users",
  description: "View and manage all users"
};

const fetchUsers = async (
  currentPage: number,
  searchQuery: string = "",
  sort: string = "ASC",
  status: string = "",
  type: string = ""
) => {
  try {
    const { data } = await apiServerClient.get(
      `/user/listing?currentPage=${currentPage}&searchQuery=${decodeURI(
        searchQuery
      )}&sort=${sort}&status=${status}&type=${type}`
    );

    return data;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const Store: React.FC<UsersPageProps> = async ({ searchParams }) => {
  const user = getUserServer();
  const isSuper = isSuperAdmin(user?.role);

  if (
    isDistributorAdminAndExecutive(user?.role) ||
    isManufacturerAdminAndExecutive(user?.role) ||
    isSuper
  ) {
    const currentPage = searchParams?.page || 1;
    const userType =
      isSuper ||
      isManufacturerAdminAndExecutive(user?.role) ||
      isDistributorAdminAndExecutive(user?.role)
        ? searchParams?.type
        : "";

    const usersData: any = await fetchUsers(
      currentPage,
      searchParams?.s,
      searchParams?.sort,
      searchParams?.status,
      userType
    );

    return (
      <>
        <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Users</h2>
        <div
          className={`flex gap-4 sm:gap-6 justify-between items-center flex-col ${isSuper ? "min-[991px]:flex-row" : "sm:flex-row"} mb-4 sm:mb-6`}
        >
          <SearchField className="w-full" containerclass="min-[991px]:w-auto" />
          <div className="flex gap-4 text-sm font-medium justify-between w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {(isSuper ||
              isManufacturerAdminAndExecutive(user?.role) ||
              isDistributorAdminAndExecutive(user?.role)) && (
              <UserRoleDropdown user={user} />
            )}
            <UserStatusDropdown />
            <AddUser
              role={user?.role}
              parentEntityId={
                isDistributorAdmin(user?.role)
                  ? user?.associatedUserId
                  : user?.parentEntityId
              }
            />
          </div>
        </div>
        <Card className="mt-6 sm:mt-8 w-full">
          {isSuper ? (
            <SuperAdminUsersTable
              users={usersData?.users || []}
              totalRes={usersData?.totalRes || 0}
              currentPage={currentPage}
              totalPages={usersData?.totalPages || 0}
              userType={userType}
            />
          ) : (
            <UsersTable
              users={usersData?.users || []}
              totalRes={usersData?.totalRes || 0}
              currentPage={currentPage}
              totalPages={usersData?.totalPages || 0}
              canInvite={
                isDistributorAdmin(user?.role) ||
                isDistributorExecutive(user?.role) ||
                isManufacturer(user?.role)
              }
            />
          )}
        </Card>
      </>
    );
  } else {
    return (
      <>
        <b className="block pb-4">Role: {user?.role} - Users</b>
        <NoAccess />
      </>
    );
  }
};

export default Store;
