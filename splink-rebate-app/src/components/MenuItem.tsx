"use client";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Menu } from "./Sidebar";

interface MenuItemProps {
  menuName: string;
  menuUrl?: string;
  isActive: boolean;
  icon?: JSX.Element;
  childMenus?: Menu[];
  [props: string]: any;
}
const MenuItem = ({
  menuName,
  menuUrl,
  isActive,
  icon,
  childMenus,
  ...props
}: MenuItemProps) => {
  const fillColor = isActive ? "#1D1D1F" : "#4C4D52"; // active and inactive colors
  const pathname = usePathname();

  const isMenuOpen =
    isActive ||
    (childMenus &&
      childMenus.some(
        (childMenu) =>
          pathname === childMenu.url ||
          pathname === childMenu.url + "/internal" ||
          pathname.startsWith(childMenu.url ?? "")
      )) ||
    // Handle all program details - keep Programs tab open when on any program detail page
    (menuName === "Programs" &&
      (pathname.startsWith("/app/programs/store/") ||
        pathname.startsWith("/app/programs/chain/") ||
        pathname.startsWith("/app/programs/spiff/") ||
        pathname.startsWith("/app/programs/sales-manager/") ||
        pathname.startsWith("/app/programs/manufacturer/") ||
        (pathname.startsWith("/app/programs/") &&
          pathname !== "/app/programs" &&
          !pathname.includes("/internal") &&
          !pathname.includes("/spiff/internal")))) ||
    // Handle store details - keep Stores tab open when on /app/store/[id] or /app/store/chains/[id]
    (menuName === "Stores" &&
      pathname.startsWith("/app/store/") &&
      pathname !== "/app/store");

  // Set initial state for showChildren
  const [showChildren, setShowChildren] = useState<{
    [key: string]: boolean | undefined;
  }>({
    [menuName]: isMenuOpen
  });

  // Clone the icon element and pass the fill color
  const IconWithProps = icon
    ? React.cloneElement(icon, { fill: fillColor })
    : null;

  useEffect(() => {
    if (childMenus) {
      setShowChildren((prev: { [key: string]: boolean | undefined }) => ({
        ...prev,
        [menuName]: isMenuOpen
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleClick = () => {
    const isCurrentMenuActive = childMenus?.some(
      (childMenu) =>
        pathname === childMenu.url ||
        pathname === childMenu.url + "/internal" ||
        pathname.startsWith(childMenu.url ?? "")
    );
    if (isCurrentMenuActive) return;

    setShowChildren((prev) => ({
      ...prev,
      [menuName]: !showChildren[menuName]
    }));
  };

  const menuContent = (
    <>
      {IconWithProps}
      <div className="flex items-center gap-2 w-full justify-between">
        <span>{menuName}</span>
        {childMenus && (
          <ChevronDownIcon
            className={`w-4 h-4 ${showChildren[menuName] ? "rotate-180" : ""}`}
          />
        )}
      </div>
    </>
  );

  return (
    <>
      {menuUrl ? (
        <Link
          prefetch
          {...props}
          href={`${menuUrl}${menuName == "Wishlist" ? "?refresh=" + Date.now() : ""}`}
          className={`flex items-center gap-2 p-3 hover:bg-common-bg ${
            isActive
              ? "font-semibold rounded bg-common-bg text-highlighted-color"
              : "font-medium text-filter-light"
          } ${menuName}`}
          onClick={handleClick}
        >
          {menuContent}
        </Link>
      ) : (
        <button
          {...props}
          className={`flex items-center gap-2 p-3 hover:bg-common-bg w-full text-left ${
            isActive || showChildren[menuName]
              ? "font-semibold rounded bg-common-bg text-highlighted-color"
              : "font-medium text-filter-light"
          } ${menuName}`}
          onClick={handleClick}
        >
          {menuContent}
        </button>
      )}

      {childMenus && showChildren[menuName] && (
        <div className="pl-4 mb-2">
          {childMenus.map((childMenu, index) =>
            childMenu.url ? (
              <Link
                key={`${childMenu.url}-${index}`}
                href={childMenu.url}
                className={`flex items-center gap-2 p-2 mb-1 hover:bg-common-bg text-[13px] ${
                  pathname == childMenu.url ||
                  // Handle store program details - keep "Store Rebates" active when on /app/programs/store/[id]
                  (childMenu.url === "/app/programs/store" &&
                    pathname.startsWith("/app/programs/store/")) ||
                  // Handle chain program details - keep "Chain" active when on /app/programs/chain/[id]
                  (childMenu.url === "/app/programs/chain" &&
                    pathname.startsWith("/app/programs/chain/")) ||
                  // Handle sales rep program details - keep "Sales Rep" active when on /app/programs/spiff/[id]
                  (childMenu.url === "/app/programs/spiff" &&
                    pathname.startsWith("/app/programs/spiff/")) ||
                  // Handle sales manager program details - keep "Sales Manager" active when on /app/programs/sales-manager/[id]
                  (childMenu.url === "/app/programs/sales-manager" &&
                    pathname.startsWith("/app/programs/sales-manager/")) ||
                  // Handle wholesale program details - keep "Wholesale" active when on /app/programs/manufacturer/[id]
                  (childMenu.url === "/app/programs" &&
                    pathname.startsWith("/app/programs/manufacturer/")) ||
                  // Handle store details - keep "Independent" active when on /app/store/[id]
                  (childMenu.url === "/app/store" &&
                    pathname.startsWith("/app/store/") &&
                    !pathname.startsWith("/app/store/chains")) ||
                  // Handle chain details - keep "Chain" active when on /app/store/chains/[id]
                  (childMenu.url === "/app/store/chains" &&
                    pathname.startsWith("/app/store/chains/"))
                    ? "font-medium rounded bg-common-bg text-highlighted-color"
                    : "font-regular text-filter-light"
                }`}
              >
                {childMenu.icon && childMenu.icon}
                <span>{childMenu.name}</span>
              </Link>
            ) : (
              <div
                key={`${childMenu.name}-${index}`}
                className="flex items-center gap-2 p-2 mb-1 text-[13px] font-regular text-filter-light"
              >
                {childMenu.icon && childMenu.icon}
                <span>{childMenu.name}</span>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
};

export default MenuItem;
