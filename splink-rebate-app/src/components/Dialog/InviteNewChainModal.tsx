// Core|Package imports
import ChainProfileForm from "@/components/Form/ChainProfile";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

// Import Images
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
// import { StoreProfileDetails } from "@/types/StoreTypes";
import { ChainFormInputs } from "@/core-ui/Input/types";
import { useRouter } from "next/navigation";
import Loader from "../Loader";

interface InviteNewChainModalType {
  chainDetails: { id: number; name: string };
  isOpen: boolean;
  onSuccess: () => void;
  onClose: (val: boolean) => void;
}

const InviteNewChainModal = ({
  chainDetails,
  isOpen,
  onClose,
  onSuccess
}: InviteNewChainModalType) => {
  const router = useRouter();
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [storesData, setStoresData] = useState<any>([]);
  const [independentStores, setIndependentStores] = useState<any>([]);

  const { reset, setValue } = useForm<ChainFormInputs>({
    mode: "onChange"
  });

  const onSubmit: SubmitHandler<ChainFormInputs> = async (data) => {
    setIsInviting(true);

    try {
      await apiClient.post("/auth/invite-existing-user", {
        role: USER_ROLES.CHAIN_ADMIN,
        firstName: data.firstName,
        lastName: data.lastName,
        phones: [data.phoneNumber],
        email: data.email,
        chainId: chainDetails.id,
        stores: Object.entries(data.stores).map(([id, data]) => ({
          id: Number(id),
          ...data
        }))
      });

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

  const fetchStoresData = async () => {
    try {
      if (!chainDetails.id) {
        return;
      }
      setLoading(true);
      const { data } = await apiClient.get(`/chain/${chainDetails.id}/stores`);
      setStoresData(data);
    } catch (error) {
      console.error("Error fetching stores using chain id");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributorStoresData = async () => {
    try {
      if (!chainDetails.id) {
        return;
      }
      setLoading(true);
      const { data } = await apiClient.get(
        `/store/get-distributor-stores/${chainDetails.id}`
      );
      setIndependentStores(data);
    } catch (error) {
      console.error("Error fetching distributor stores");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoresData();
    fetchDistributorStoresData();
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onClose={closePopup} className="relative z-50">
        {/* Popup Content */}
        {loading ? (
          <Loader
            show={loading}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
          />
        ) : (
          <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black/20 p-4">
            <div className="relative flex min-h-full items-center justify-center">
              <Loader
                show={isInviting}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
              />
              <DialogPanel className="w-full max-w-lg rounded bg-white px-4 sm:px-6 py-5 shadow-lg sm:min-w-[670px]">
                <DialogTitle className="mb-5 font-semibold text-lg text-highlighted-color flex justify-between items-center">
                  <span>Invite Chain</span>
                  <Image
                    onClick={closePopup}
                    className="cursor-pointer"
                    src={popupCloseIcon.src}
                    width={13}
                    height={13}
                    alt="Close Button"
                  />
                </DialogTitle>

                <ChainProfileForm
                  storesData={storesData}
                  independentStores={independentStores}
                  isLoading={isInviting}
                  defaultValues={{
                    id: chainDetails.id,
                    name: chainDetails.name
                  }}
                  onSubmit={onSubmit}
                  onCancel={closePopup}
                />
              </DialogPanel>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default InviteNewChainModal;
