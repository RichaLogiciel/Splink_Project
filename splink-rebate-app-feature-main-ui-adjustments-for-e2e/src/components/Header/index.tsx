/* eslint-disable @next/next/no-img-element */

// Import Core Components
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Import Utils
import { APP_ROUTES } from "@/configs/routes";
import {
  getUserClient,
  isImpersonating,
  logoutAsUser
} from "@/utils/getUserClient";
import { getFullName, getInitials } from "@/utils/helper";
import { logout } from "@/utils/logout";
import { isSuperAdmin } from "@/utils/rolesConditions";

// Import Images
import greyUserIcon from "@/assets/icons/greyUserIcon.svg";
import lockIcon from "@/assets/icons/lockIcon.svg";
import redLogoutIcon from "@/assets/icons/redLogoutIcon.svg";
import whiteLogoutIcon from "@/assets/icons/whiteLogoutIcon.svg";
import hamburgerMenu from "@/assets/logo/hamburger-menu.png";
import ProgramsIcon from "../icons/menus/programs";

interface HeaderProps {
  isSidebarOpen: boolean; // State to determine if the sidebar is open
  toggleSidebar: () => void; // Function to toggle sidebar
  sidebarWidth: number;
}
const Header = ({
  isSidebarOpen,
  toggleSidebar,
  sidebarWidth
}: HeaderProps) => {
  const router = useRouter();
  const user = getUserClient();
  const userRole = user?.role || "";

  const [userLogo, setUserLogo] = useState(
    (!isSuperAdmin(userRole) && user?.logo) || ""
  );

  const fullName = getFullName(user?.firstName, user?.lastName);
  const nameInit = getInitials(fullName || user?.name || "");
  const showName = (userLogo == "" || userLogo == greyUserIcon.src) && fullName;

  const doLogout = () => {
    logout();
    router.push(APP_ROUTES.login);
  };

  const isImpersonatingUser = isImpersonating();
  return (
    <header
      className={`left-0 z-10 fixed bg-white px-4 sm:px-8 min-h-14 h-[60px] flex items-center shadow-bottom-drop-shadow`}
      style={{
        marginLeft: `${isSidebarOpen ? sidebarWidth : 0}px`,
        width: `calc(100% - ${isSidebarOpen ? sidebarWidth : 0}px)`
      }}
    >
      <div className="flex items-center justify-between w-full h-full gap-3.5">
        <div className="hamburger-menu-and-search flex items-center">
          <button onClick={toggleSidebar}>
            <img src={hamburgerMenu.src} alt="Logo" className="h-3 mr-3" />
          </button>
        </div>
        {isImpersonatingUser && (
          <div className="flex justify-end items-center gap-4 h-10 text-xs min-[400px]:text-sm bg-blue-bg text-white rounded p-1.5 pl-2">
            <p className="hidden md:block overflow-hidden text-nowrap text-ellipsis max-w-64 text-heading-blue">
              Logged in as <strong>{fullName || "an User"}</strong>
            </p>
            <button
              className="bg-green h-full rounded py-1 px-2 flex items-center gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90 w-[135px]"
              onClick={logoutAsUser}
            >
              <Image
                src={whiteLogoutIcon.src}
                height={14}
                width={14}
                alt="Logout Icon"
              />
              Back to Admin
            </button>
          </div>
        )}
        <div className="notifications-and-profile-icon gap-4 h-full flex justify-center items-center">
          <div className="profile-icon h-full cursor-pointer flex items-center relative">
            <div className="flex justify-end items-center gap-2.5 h-10 max-w-44 sm:max-w-72 text-sm bg-common-bg rounded py-1 px-2">
              {showName && (
                <span className="w-full uppercase text-highlighted-color font-semibold overflow-hidden text-nowrap text-ellipsis text-xs sm:text-sm">
                  {isSuperAdmin(userRole) ? fullName : user?.name}
                </span>
              )}
              {userLogo && (
                <div className="max-h-8 h-full">
                  <Image
                    src={userLogo}
                    alt="Distributor Logo"
                    className="h-full w-full max-w-36 object-contain"
                    width={132}
                    height={16}
                    onErrorCapture={() => setUserLogo("")}
                  />
                </div>
              )}
              {nameInit && (
                <div
                  className={`avatar min-h-8 min-w-8 overflow-hidden flex justify-center items-center text-[10px] bg-[#002617] rounded-full border-2 border-[rgba(0, 38, 23)]`}
                >
                  <span
                    className={`font-medium leading-[1] text-xs text-white`}
                  >
                    {nameInit}
                  </span>
                </div>
              )}
            </div>

            <div className="profile-dropdown absolute top-[55px] bg-white right-0 overflow-hidden rounded shadow-header-user-dropdown invisible opacity-0 transition -z-50 max-w-[250px] w-full min-w-[180px] border border-border-gray py-1">
              <ul className="text-xs font-medium">
                {fullName && (
                  <li className="hover:bg-gray-100 px-3 py-2 text-highlighted-color uppercase">
                    {fullName}
                  </li>
                )}
                <li
                  className="hover:bg-gray-100 px-3 py-3 text-filter-light flex gap-2.5 items-center"
                  onClick={() => router.push(APP_ROUTES.account)}
                >
                  <Image
                    src={greyUserIcon.src}
                    height={14}
                    width={14}
                    alt="Logout Icon"
                  />
                  My Account
                </li>
                <li
                  className="hover:bg-gray-100 px-3 py-3 text-filter-light flex gap-2.5 items-center"
                  onClick={() => router.push(APP_ROUTES.myPrograms)}
                >
                  <ProgramsIcon height={14} width={14} />
                  My Programs
                </li>
                <li
                  className="hover:bg-gray-100 px-3 py-3 text-filter-light flex gap-2.5 items-center"
                  onClick={() => router.push(APP_ROUTES.changePassword)}
                >
                  <Image
                    src={lockIcon.src}
                    height={14}
                    width={14}
                    alt="Logout Icon"
                  />
                  Change Password
                </li>
                {!isImpersonatingUser && (
                  <li
                    className="hover:bg-gray-100 px-3 py-3 text-[#C20606] flex gap-2.5 items-center border-t border-border-gray"
                    onClick={doLogout}
                  >
                    <Image
                      src={redLogoutIcon.src}
                      height={14}
                      width={14}
                      alt="Logout Icon"
                    />
                    Logout
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
