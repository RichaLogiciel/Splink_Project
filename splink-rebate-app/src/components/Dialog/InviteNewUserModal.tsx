// Core|Package imports
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from "@headlessui/react";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

// Import Components
import InputWithIcon from "../Form/InputWithIcon";
import SelectBox from "../Form/SelectBox";

// Import Images
import greenTickIcon from "../../assets/icons/greenTickIcon.svg";
import popupCloseIcon from "../../assets/icons/popupCloseIcon.svg";
import popupRedCloseIcon from "../../assets/icons/popupRedCloseIcon.svg";
import searchIcon from "../../assets/icons/searchIcon.svg";
import squareInfoIcon from "../../assets/icons/squareInfoIcon.svg";

// Import Mocks
import { apiClient } from "@/lib/axiosClient";
import { getUserClient } from "@/utils/getUserClient";
import {
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isManufacturerAccountManager,
  isManufacturerAdminAndExecutive
} from "@/utils/rolesConditions";
import { useRouter } from "next/navigation";
import Loader from "../Loader";

type Option = {
  label: string;
  value: string;
};

interface InviteNewUserModalType {
  isOpen: boolean;
  rolesToInvite: Option[];
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  role: string;
}

interface InviteUserProp {
  email: string;
  role: string;
  childUsers: { name: string; id: number }[] | undefined;
}

function getFirstLetter(str: string): string {
  if (!str) return "";

  return str.charAt(0).toUpperCase();
}

const InviteNewUserModal = ({
  rolesToInvite,
  isOpen,
  setIsOpen
}: InviteNewUserModalType) => {
  const initialFormState = {
    userEmail: "",
    userRole: rolesToInvite[0]?.value || ""
  };
  const router = useRouter();

  const [formData, setFormData] = useState(initialFormState);
  const [usersList, setUsersList] = useState<InviteUserProp[]>([]);
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [options, setOptions] = useState<{ name: string; id: number }[]>([]);

  const user = getUserClient();

  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const url = `/manufacturer/get-distributors`;

        const { data }: any = await apiClient.get(url);

        setOptions(
          (data ?? []).map((di: any) => ({
            name: di.name,
            id: di.associatedUserId
          }))
        );
      } catch (error) {
        console.error("Error fetching manufacturer distributors:", error);
      }
    };

    const fetchDistributorWarehouses = async () => {
      try {
        const url = `/distributor/get-distributor-warehouses`;

        const { data }: any = await apiClient.get(url);

        setOptions(
          (data ?? []).map((di: any) => ({
            name: di.name,
            id: di.id
          }))
        );
      } catch (error) {
        console.error("Error fetching distributor warehouses:", error);
      }
    };

    if (isOpen) {
      if (isManufacturerAdminAndExecutive(user?.role)) fetchDistributors();
      if (isDistributorAdminAndExecutive(user?.role))
        fetchDistributorWarehouses();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closePopup = () => setIsOpen(false);

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement
  > = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addUser: React.FormEventHandler<HTMLFormElement> = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    // Check if the email already exists
    const existingUserIndex = usersList.findIndex(
      (user) => user.email === formData.userEmail
    );

    if (existingUserIndex !== -1) {
      changeRole(existingUserIndex, formData.userRole);
    } else {
      setUsersList([
        ...usersList,
        {
          email: formData.userEmail,
          role: formData.userRole,
          childUsers: isManufacturerAccountManager(formData.userRole)
            ? []
            : undefined
        }
      ]);
    }

    // Reset the form after submission
    setFormData(initialFormState);
  };

  // Remove user by index
  const removeUser = (index: number) => {
    setUsersList((prevList) => prevList.filter((_, i) => i !== index));
  };

  const changeRole = (
    existingUserIndex: number,
    currentTarget: string
  ): void => {
    const isManager =
      isManufacturerAccountManager(currentTarget) ||
      isDistributorGeneralManager(currentTarget);
    const updatedUsers = usersList.map((user, index) =>
      index === existingUserIndex
        ? {
            ...user,
            role: currentTarget,
            childUsers: isManager ? [] : undefined
          }
        : {
            ...user,
            childUsers: isManager
              ? user?.childUsers
                ? user.childUsers
                : []
              : undefined
          }
    );
    setUsersList(updatedUsers);
  };

  const handleManagerDistributorsSelectChange = (
    existingUserIndex: number,
    childUsers: { name: string; id: number }[]
  ): void => {
    const updatedUsers = usersList.map((user, index) =>
      index === existingUserIndex ? { ...user, childUsers: childUsers } : user
    );
    setUsersList(updatedUsers);
  };

  const sendInvite: React.MouseEventHandler<HTMLButtonElement> = async () => {
    try {
      setIsInviting(true);
      const emails: InviteUserProp[] = usersList;

      await apiClient.post("/auth/invite-users", {
        emails
      });

      // Remove all users after Invite
      setUsersList([]);

      toast.success("Invite has been sent to email addresses!");
      closePopup();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.data || "Unable to send Invitations to the users.");
    } finally {
      setIsInviting(false);
    }
  };

  const getSearchText = useMemo(() => {
    if (isDistributorAdminAndExecutive(user?.role))
      return "Select Warehouses to assign...";
    return "Select Distributors to assign...";
  }, [user, isOpen]);

  return (
    <>
      <Dialog open={isOpen} onClose={closePopup} className="relative z-50">
        {/* Popup Content */}
        <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black/20 p-4">
          <div className="relative flex min-h-full items-center justify-center">
            <Loader
              show={isInviting}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
            />
            <DialogPanel className="w-full max-w-lg rounded bg-white px-4 sm:px-6 py-5 shadow-lg">
              <DialogTitle className="mb-8 font-semibold text-lg text-highlighted-color flex justify-between items-center">
                <span>Invite New User</span>
                <Image
                  onClick={closePopup}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  width={13}
                  height={13}
                  alt="Close Button"
                />
              </DialogTitle>

              <form
                onSubmit={addUser}
                className={`flex justify-between gap-2 ${isInviting ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}
              >
                <div className="w-full border border-border-gray rounded relative flex items-center">
                  <InputWithIcon
                    name="userEmail"
                    icon={searchIcon.src}
                    value={formData.userEmail}
                    onChange={handleChange}
                    iconClass="top-[10px]"
                    className="pl-9 border-none text-sm appearance-none py-2 focus:!ring-0 focus:!outline-none flex-1 pr-2"
                    colors="error"
                    containerClass="w-full"
                    placeholder="Enter email address"
                  />
                  <SelectBox
                    name="userRole"
                    value={formData.userRole}
                    onChange={handleChange}
                    className="cursor-pointer border-none text-xs pr-[0] pl-[0] py-2 bg-transparent w-auto max-w-36 flex-1"
                    options={rolesToInvite}
                  />
                </div>
                <button
                  disabled={isInviting}
                  className={`w-14 rounded outline-none text-center py-2 bg-green hover:bg-opacity-90 text-white text-xs`}
                  type="submit"
                >
                  Add
                </button>
              </form>

              {usersList.length > 0 ? (
                <div
                  className={`mt-7 text-sm ${isInviting ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}
                >
                  {usersList.map((user, index) => (
                    <div
                      className="border-b border-border-gray"
                      key={user.email + index}
                    >
                      <div className="flex justify-between py-2.5 gap-1 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                          <span className="text-sm rounded-full bg-[#D9D9D9] w-7 h-7 sm:w-9 sm:h-9 flex justify-center items-center">
                            {getFirstLetter(user.email)}
                          </span>
                          <span className="max-w-28 sm:max-w-60 break-all overflow-hidden">
                            {user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <SelectBox
                            onChange={({ currentTarget }: any) =>
                              changeRole(index, currentTarget.value)
                            }
                            className="cursor-pointer border-none bg-[#9D9D9D] bg-opacity-20 pl-1 py-1 pr-4 sm:pr-8 sm:pl-1.5 sm:py-1.5 text-[11px] custom-dropdown sm:text-xs max-w-32 sm:max-w-36"
                            value={user?.role}
                            options={rolesToInvite}
                          />
                          <Image
                            onClick={() => removeUser(index)}
                            className="cursor-pointer"
                            src={popupRedCloseIcon.src}
                            width={11}
                            height={11}
                            alt="Close Button"
                          />
                        </div>
                      </div>
                      {(isManufacturerAccountManager(user.role) ||
                        isDistributorGeneralManager(user.role)) && (
                        <Listbox
                          value={user?.childUsers ?? []}
                          onChange={(selectUser: any) => {
                            handleManagerDistributorsSelectChange(
                              index,
                              selectUser
                            );
                          }}
                          multiple
                        >
                          <div className="relative w-full mb-3">
                            <ListboxButton className="w-full border border-gray-300 rounded-md bg-white py-2 px-4 text-left shadow-sm focus:outline-none focus:ring-2 dark:focus:ring-blue-600 focus:border-blue-500">
                              {user?.childUsers && user?.childUsers.length > 0
                                ? user.childUsers
                                    .map((childUser) => childUser.name)
                                    .join(", ")
                                : getSearchText}
                            </ListboxButton>

                            <ListboxOptions className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {options.map((option) => (
                                <ListboxOption
                                  key={option.id}
                                  value={option}
                                  className={({ active }) =>
                                    `cursor-pointer select-none px-4 py-2 ${
                                      active
                                        ? "bg-blue-100 text-blue-900"
                                        : "text-gray-900"
                                    }`
                                  }
                                >
                                  {({ selected }) => (
                                    <div className="flex gap-2 justify-start">
                                      {selected ? (
                                        <span className="left-2 top-2.5 text-indigo-600">
                                          <Image
                                            height={15}
                                            width={15}
                                            className="max-h-4"
                                            src={greenTickIcon.src}
                                            alt="Green Tick Icon"
                                          />
                                        </span>
                                      ) : (
                                        <span className="left-2 top-2.5 text-indigo-600 w-[15px] h-[15px]"></span>
                                      )}
                                      <span
                                        className={`block truncate ${
                                          selected
                                            ? "font-medium"
                                            : "font-normal"
                                        }`}
                                      >
                                        {option.name}
                                      </span>
                                    </div>
                                  )}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </div>
                        </Listbox>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-border-gray border-b p-8">
                  <div className="max-w-64 mx-auto text-center text-sm text-[#666]">
                    <Image
                      className="inline-block mb-3"
                      src={squareInfoIcon.src}
                      width={18}
                      height={18}
                      alt="Info Icon"
                    />
                    <p>
                      Enter the email to invite an Executive or Sales
                      Representative
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-row-reverse mt-5 gap-3 text-sm">
                <button
                  onClick={sendInvite}
                  disabled={usersList.length == 0 || isInviting}
                  className="px-4 py-2 text-white rounded bg-green min-w-24 disabled:opacity-60"
                >
                  {isInviting ? "Sending Invite" : "Send Invite"}
                </button>
                <button
                  onClick={closePopup}
                  disabled={isInviting}
                  className="px-4 py-2 text-white rounded bg-black min-w-24 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default InviteNewUserModal;
