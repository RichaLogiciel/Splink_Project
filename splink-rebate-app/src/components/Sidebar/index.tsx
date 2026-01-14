import Image from "next/image";
import { usePathname } from "next/navigation";
import React from "react";
import splinkLogo from "../../assets/logo/splink.png";
import MenuItem from "../MenuItem";

import { USER_ROLES } from "@/configs/roles";
import { getRelatedUsersClient, getUserClient } from "@/utils/getUserClient";
import AccountSwitcher from "./AccountSwitcher";
import { SETTINGS_MENU, SIDE_BAR_MENUS } from "./menus";
import { isDistributorFeatureEnabled } from "@/utils/helper";
import { APP_ROUTES } from "@/configs/routes";
import { STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";

export interface Menu {
  name: string;
  url?: string;
  icon?: React.JSX.Element;
  children?: Menu[];
}

interface SidebarProps {
  isSidebarOpen: boolean; // State to determine if the sidebar is open
  toggleSidebar: () => void; // Function to toggle sidebar
  sidebarWidth: number;
  closeMobileMenu?: () => void;
  innerWidth?: number;
}

const Sidebar = ({
  isSidebarOpen,
  toggleSidebar,
  sidebarWidth,
  closeMobileMenu = () => {},
  innerWidth = 0
}: SidebarProps) => {
  const pathname = usePathname();

  const user = getUserClient();
  const relatedUsers = getRelatedUsersClient();

  const hideSettings = [USER_ROLES.STORE, USER_ROLES.CHAIN_ADMIN].includes(
    user?.role ?? ""
  );

  const menus: Menu[] = SIDE_BAR_MENUS[user?.role || ""] || [];
  const computedMenus: Menu[] = React.useMemo(() => {
    if (user?.role !== USER_ROLES.DISTRIBUTOR_SALES_REP) return menus;
    const distributorId =
      user?.parentEntityId ?? user?.associatedUserId ?? null;
    const enabled = isDistributorFeatureEnabled(
      distributorId,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    );
    if (enabled) return menus;

    return menus
      .map((menu) => {
        if (!menu.children || menu.name !== "Programs") return menu;
        const filteredChildren = menu.children.filter(
          (child) => child.url !== APP_ROUTES.storePrograms
        );
        if (filteredChildren.length === 0) return null as unknown as Menu;
        return { ...menu, children: filteredChildren } as Menu;
      })
      .filter(Boolean) as Menu[];
  }, [menus, user]);
  const settingMenu: Menu[] = SETTINGS_MENU[user?.role || ""] || [];

  return (
    <>
      <aside
        className={`flex gap-7 flex-col justify-between transition-all duration-300 ease-in-out ${
          innerWidth <= 1199 ? "fixed" : "sticky top-0 h-screen"
        } min-h-screen bg-white text-custom-black shadow-right-drop-shadow z-30`}
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
      >
        {isSidebarOpen && (
          <>
            <div className="logo-and-menus">
              <div className="h-[60px] border-b border-b-border-gray flex items-center pl-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={splinkLogo.src} alt="Logo" className="h-[26px]" />
              </div>

              {user && relatedUsers?.length ? (
                <AccountSwitcher user={user} relatedUsers={relatedUsers} />
              ) : null}

              <nav className="flex flex-col gap-2 mx-6 text-sm pt-6">
                <div className="menu-level1 text-heading-very-light text-xs font-semibold">
                  General
                </div>
                {computedMenus.map((menu, index: number) => {
                  return (
                    <MenuItem
                      onClick={() => closeMobileMenu()}
                      key={index}
                      menuName={menu.name}
                      menuUrl={menu.url}
                      isActive={
                        menu.url ? pathname?.startsWith(menu.url) : false
                      }
                      icon={menu.icon}
                      childMenus={menu.children}
                    />
                  );
                })}
              </nav>
              {!hideSettings && (
                <nav className="flex flex-col gap-2 mt-6 mx-6 text-sm">
                  <div className="menu-level1 text-heading-very-light text-xs font-semibold">
                    SETTINGS
                  </div>
                  {settingMenu.map((menu, index) => (
                    <MenuItem
                      key={index}
                      menuName={menu.name}
                      menuUrl={menu.url || "#"}
                      isActive={
                        menu.url ? pathname?.startsWith(menu.url) : false
                      }
                      icon={menu.icon}
                    />
                  ))}
                </nav>
              )}
            </div>

            {/* Assistance text at the bottom */}
            <div className="mb-4 mx-6 text-[13px] text-center text-gray-500">
              {user?.distributorLogo && (
                <div className="mb-4 px-4 text-center">
                  <Image
                    className="block w-full h-auto"
                    src={user?.distributorLogo}
                    alt={user?.distributorName || ""}
                    width={160}
                    height={20}
                  />
                </div>
              )}
              <p>
                <span>Need assistance? Contact us at </span>
                <a
                  href="mailto:help@splinktechnologies.com"
                  className="text-blue-500 underline"
                >
                  help@splinktechnologies.com
                </a>
              </p>
            </div>
          </>
        )}
      </aside>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 xl:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
