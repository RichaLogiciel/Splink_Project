"use client";

// Core|Package imports
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { apiClient } from "@/lib/axiosClient";
import { StoreProfileDetails } from "@/types/StoreTypes";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import SalesRepProfile from "../Form/SalesRepProfile";
import Loader from "../Loader";

interface InviteNewStoreModalType {
  storeDetails?: StoreProfileDetails;
  isOpen: boolean;
  user: any;
  onSuccess: () => void;
  onClose: (val: boolean) => void;
}

interface Inputs {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  storeName?: string;
}

const InviteNewSalesRepModal = ({
  storeDetails = {},
  isOpen,
  onClose,
  onSuccess,
  user
}: InviteNewStoreModalType) => {
  const router = useRouter();
  const [isInviting, setIsInviting] = useState<boolean>(false);

  const { reset, setValue } = useForm<Inputs>({
    mode: "onChange"
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsInviting(true);
    try {
      const userRole = user?.UserRole?.role || "DISTRIBUTOR_SALES_REP";
      const apiPayload: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: userRole
      };

      // Include salesRepId if user id is available
      if (user?.id) {
        apiPayload.salesRepId = user.id;
      }

      // Only include phones array if phone number is provided
      if (data.phoneNumber && data.phoneNumber.trim()) {
        apiPayload.phones = [data.phoneNumber];
      }

      await apiClient.post("/auth/invite-existing-user", apiPayload);

      toast.success("Invitation successfully sent to the store email address.");

      setTimeout(() => {
        reset();
        onSuccess();
        router.refresh();
      }, 500);
    } catch (error: any) {
      toast.error(
        error?.data ||
          "Unable to send the invitation. Please verify the details and try again."
      );
    } finally {
      setIsInviting(false);
    }
  };

  const closePopup = () => {
    reset();
    onClose(false);
  };

  useEffect(() => {
    if (isOpen) {
      setValue("storeName", storeDetails.storeName || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
            <DialogPanel className="w-full max-w-lg rounded bg-white px-4 sm:px-6 py-5 shadow-lg sm:min-w-[670px]">
              <DialogTitle className="mb-5 font-semibold text-lg text-highlighted-color flex justify-between items-center">
                <span>Invite Sales Rep</span>
                <Image
                  onClick={closePopup}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  width={13}
                  height={13}
                  alt="Close Button"
                />
              </DialogTitle>

              <SalesRepProfile
                key={`sales-rep-${user?.id}-${isOpen}`}
                isFillEmail={false}
                submitLabel={isInviting ? "Sending Invite" : "Send Invite"}
                isLoading={isInviting}
                defaultValues={storeDetails}
                onSubmit={onSubmit}
                onCancel={closePopup}
                popupStyle
                user={user}
                showPasswordField={false}
                isPhoneRequired={true}
              />
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default InviteNewSalesRepModal;
