"use client";
import rightArrow from "@/assets/icons/rightArrowIcon.svg";
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import { apiClient } from "@/lib/axiosClient";
import { LoginResponseType, RelatedUsers, UserCookie } from "@/types/UsersType";
import { switchAccount } from "@/utils/getUserClient";
import { getFullName } from "@/utils/helper";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmationDialog from "../Dialog/ConfirmWishlistItemDelete";

interface AccountSwitcherProps {
  user: UserCookie;
  relatedUsers?: RelatedUsers[];
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  user,
  relatedUsers = []
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUserID, setSelectedUserID] = useState<number | null>(null);
  const [isConfirmModelOpen, setIsConfirmModelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fullName = getFullName(user?.firstName, user?.lastName);

  // Create allRelatedUser array once using useMemo
  const allRelatedUser = useMemo(() => {
    return [
      ...relatedUsers,
      {
        name: user?.name || fullName,
        logo: user?.logo || "",
        id: user?.id,
        role: user?.role
      }
    ];
  }, [relatedUsers, user, fullName]);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleConfirmOpen = useCallback(
    (userID: number) => {
      if (userID === user.id) return;

      setSelectedUserID(userID);
      setIsDropdownOpen(false);
      setIsConfirmModelOpen(true);
    },
    [user.id]
  );

  const handleAccountSwitch = async () => {
    if (!selectedUserID) {
      toast.error("Unable to find User ID.");
      return;
    }

    setIsLoading(true);
    try {
      const { data }: LoginResponseType = await apiClient.post(
        `/auth/loginas/${selectedUserID}`
      );

      switchAccount(data);
    } catch (error: any) {
      console.error("Error switching account:", error);
      toast.error(
        error?.response?.data?.message || "Unable to switch to selected account"
      );
    } finally {
      setIsLoading(false);
      setIsConfirmModelOpen(false);
      setSelectedUserID(null);
    }
  };

  return (
    <div className="p-6 pb-0 relative text-sm">
      <div
        className="bg-[#F5F5F666] p-2.5 border-border-gray border rounded cursor-pointer flex items-center justify-between"
        onClick={toggleDropdown}
        onKeyDown={(e) => e.key === "Enter" && toggleDropdown()}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
      >
        <div className="flex gap-4 items-center">
          <ManufacturerAvatar
            user={{
              name: user?.name || fullName,
              logo: user?.logo
            }}
          />
        </div>
        {allRelatedUser.length > 1 && (
          <Image height={14} width={8} src={rightArrow} alt="Switch account" />
        )}
      </div>

      {isDropdownOpen && (
        <div className="account-dropdown absolute left-full top-3 bg-white border border-border-gray rounded shadow-bottom-drop-shadow w-64">
          {allRelatedUser?.map((account) => (
            <div
              key={`${account.id}-${account.name}`}
              className={`flex gap-4 items-center py-3 px-2.5 hover:bg-gray-50 ${
                account.id === user.id
                  ? "select-none bg-gray-50"
                  : "cursor-pointer"
              }`}
              onClick={() =>
                account.id !== user.id && handleConfirmOpen(account.id)
              }
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                account.id !== user.id &&
                handleConfirmOpen(account.id)
              }
            >
              <ManufacturerAvatar
                user={{
                  name: account.name,
                  logo: account.logo
                }}
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={isConfirmModelOpen}
        title="Switch to a Different Account"
        message="You are about to switch to a different account. Do you want to continue?"
        onClose={() => setIsConfirmModelOpen(false)}
        onConfirm={handleAccountSwitch}
      />
    </div>
  );
};

export default AccountSwitcher;
