// Import Components
import StoreProgramInfo from "@/components/Elements/StoreProgramInfo";
import { ProgramStoresListingModalProps } from "@/types/StoreTypes";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

import { MESSAGES } from "@/configs/messages";

const ProgramStoresListingModal: React.FC<ProgramStoresListingModalProps> = ({
  data,
  onClose,
  stores,
  viewDetails
}) => {
  return (
    <Dialog open={!!data} onClose={onClose} className="relative z-50">
      {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
      <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="max-w-2xl w-full min-h-[250px] border bg-white p-6 rounded-lg">
            <DialogTitle className="flex justify-between">
              <span className={`flex-1 font-medium text-lg}`}>
                Stores Compliance Status {`(${data?.programTitle})`}
              </span>
            </DialogTitle>
            <div className="mt-6 border rounded-lg p-4">
              <div className="text-xs">
                <ul
                  className={`text-sm max-h-48 [@media(min-height:600px)]:max-h-[40vh] [@media(min-height:720px)]:max-h-[50vh]} overflow-y-auto pr-2 -mr-2`}
                >
                  {stores?.length ? (
                    stores.map((store, index) => (
                      <li
                        key={`${store.name}-${index}`}
                        className="cursor-pointer"
                      >
                        {!!data && (
                          <StoreProgramInfo
                            label={store.name}
                            showIcon={data.completedComplianceEntityIds?.includes(
                              store.id
                            )}
                            showValue={false}
                            viewTierDetails={() => {
                              viewDetails({
                                ...data,
                                storeId: store.id
                              });
                            }}
                          />
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="py-3.5 text-heading-very-light text-sm text-center">
                      {MESSAGES.NO_RECORDS_FOUND}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
export default ProgramStoresListingModal;
