// Core|Package imports
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Images
import { apiClient } from "@/lib/axiosClient";
import { useState } from "react";
import { toast } from "react-toastify";
import popupCloseIcon from "../../assets/icons/popupCloseIcon.svg";
import Loader from "../Loader";

interface ReplaceEmailModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  oldEmail: string;
}

const ReplaceEmailModal = ({
  isOpen,
  setIsOpen,
  oldEmail
}: ReplaceEmailModalProps) => {
  const closePopup = () => setIsOpen(false);
  const [newEmail, setNewEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const sendReplaceEmailInvite = async () => {
    try {
      setIsInviting(true);
      const reqBody: any = {
        oldEmail: oldEmail,
        newEmail: newEmail
      };
      await apiClient.post("/auth/replace-email", reqBody);

      toast.success("Invite has been sent to the new email address!");
      closePopup();
    } catch (err: any) {
      toast.error(
        err?.data || "Unable to send invitation to the new email address."
      );
    } finally {
      setIsInviting(false);
    }
  };
  return (
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
              <span>Replace Email & Send Invite</span>
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
              className={`border border-border-gray rounded relative ${isInviting ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}
            >
              <input
                className="border rounded px-4 w-full focus:outline-none h-10 font-normal text-sm py-1.5 border-gray-300 focus:ring-2 focus:ring-primary/60 cursor-text"
                placeholder="New Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </form>

            <div className="flex flex-row-reverse mt-5 gap-3 text-sm">
              <button
                onClick={sendReplaceEmailInvite}
                disabled={isInviting}
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
  );
};
export default ReplaceEmailModal;
