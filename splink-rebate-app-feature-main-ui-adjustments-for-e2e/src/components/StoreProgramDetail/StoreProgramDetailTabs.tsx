"use client";

import DownloadCSVButton from "@/components/Buttons/DownloadCSVButton";
import Card from "@/components/Card";
import BulkEnrollmentConfirmationDialog from "@/components/Dialog/BulkEnrollmentConfirmationDialog";
import CategorizedTabProductList from "@/components/Elements/CategorizedTabProductList";
import SearchField from "@/components/SearchField";
import RetailerProgramTable from "@/components/Table/RetailerProgramTable";
import StoreTable from "@/components/Table/StoreTable";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import Button from "@/core-ui/Button";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";
import { getEnhancedPrograms } from "@/utils/programComplianceHelper";

interface DistributorProgram {
  id?: number;
  [key: string]: any;
}

interface StoreProgramDetailTabsProps {
  retailerPrograms: DistributorProgram[];
  programStoreCompliancesDetail: any[];
  enrolledProgram: any;
  unenrolledProgram: any;
  manufacturerId: number;
  manufacturerName?: string;
  manufacturerLogo?: string;
  programTimeline: string;
  isSalesRep?: boolean;
  isAdmin?: boolean;
  showBulkEnrollment?: boolean;
  bulkEnrollmentProps?: {
    selectedEnrolledStores: string[];
    selectedUnenrolledStores: string[];
    setSelectedEnrolledStores: (stores: string[]) => void;
    setSelectedUnenrolledStores: (stores: string[]) => void;
    onBulkEnroll: (action: "enroll" | "unenroll") => void;
    onClearEnrolled: () => void;
    onClearUnenrolled: () => void;
    onSingleStoreEnroll: (
      storeId: string,
      action: "enroll" | "unenroll"
    ) => void;
    agreements: any[];
    isBulkEnrollmentDialogOpen: boolean;
    onCloseDialog: () => void;
    onConfirmBulkEnrollment: () => void;
    bulkEnrollmentAction: "enroll" | "unenroll";
    isBulkEnrollmentLoading: boolean;
    selectedAgreementId?: string;
    retailerPrograms?: Array<{ id?: number; [key: string]: any }>;
  };
  categorizedProducts?: any;
  pdfButton?: React.ReactNode;
  programIds: number[];
  isLoadingTable?: boolean;
  isAuthorizedManufacturer?: boolean;
  isIndependentStores?: boolean;
  searchQuery?: string;
  warehouseId?: string;
  isInternal?: boolean;
  sort?: string;
  sortKey?: string;
  user?: any;
  loadingRetailerProgramComplianceDetails?: boolean;
  processingStoreIds?: string[];
}

const StoreProgramDetailTabs: React.FC<StoreProgramDetailTabsProps> = ({
  retailerPrograms,
  programStoreCompliancesDetail,
  enrolledProgram,
  unenrolledProgram,
  manufacturerId,
  manufacturerName,
  manufacturerLogo,
  programTimeline,
  isSalesRep = false,
  isAdmin = false,
  showBulkEnrollment = false,
  bulkEnrollmentProps,
  categorizedProducts,
  pdfButton,
  programIds,
  isLoadingTable = false,
  isAuthorizedManufacturer,
  isIndependentStores,
  searchQuery,
  warehouseId,
  isInternal,
  sort,
  sortKey,
  user,
  loadingRetailerProgramComplianceDetails = false,
  processingStoreIds
}) => {
  return (
    <>
      <div className="mt-2 sm:mt-6">
        <Tabs
          autoAdjustHeight={false}
          className="px-[0px] py-[0px] font-medium text-heading-light"
          labelClass={"store-detail-tabs"}
          labelContainerClass="w-full flex-wrap lg:flex-nowrap"
          customTabElementInEnd={pdfButton}
          disableRouterPush={true}
        >
          <Tab label="Overview">
            <Card className="w-full p-6">
              <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                Retailer Program
              </h3>
              <RetailerProgramTable
                id="retailer-program-table"
                programs={getEnhancedPrograms(
                  retailerPrograms,
                  programStoreCompliancesDetail || []
                )}
                manufacturerData={{
                  name: manufacturerName || "",
                  avatar: manufacturerLogo || ""
                }}
                storeComplianceTotal={
                  enrolledProgram?.totalStores + unenrolledProgram?.totalStores
                }
                showProgramSpecificEnrollments
                isComplianceDetailLoading={
                  loadingRetailerProgramComplianceDetails
                }
              />
            </Card>

            {categorizedProducts &&
              Object.keys(categorizedProducts || {})?.length > 0 && (
                <Card className="w-full p-6 mt-6 relative">
                  <h3 className="text-filter-light mb-4 text-base font-medium tracking-[0.15rem] uppercase">
                    Recommended Products
                  </h3>
                  <CategorizedTabProductList
                    categorizedProducts={categorizedProducts}
                    className=""
                    tabSearchParamKey={"programOverviewProductTab"}
                    showAddIcon={false}
                  />
                </Card>
              )}
          </Tab>
          <Tab label="Stores">
            <Card className="w-full p-6">
              <div className="flex justify-between items-start flex-col gap-4 mb-4">
                <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                  Stores
                </h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-between w-full">
                  <SearchField
                    className={isSalesRep ? "text-xs md:flex-1" : "text-xs"}
                    pageVariable={PAGINATION_PAGE_QUERY_PARAMS.ENROLLEDPAGE}
                  />
                  <div className="flex items-center gap-3">
                    {showBulkEnrollment && isAdmin ? (
                      <DownloadCSVButton
                        stores={enrolledProgram?.stores || []}
                        filename={`${user?.name}-enrolled-stores-for-${manufacturerName || "manufacturer"}-program`?.replace(
                          /[^a-zA-Z0-9]/g,
                          "-"
                        )}
                        fieldPreset="enrolledStores"
                        className="hidden md:flex text-xs px-2 py-1 min-w-min [&_img]:w-3 [&_img]:h-3"
                        manufacturerId={manufacturerId}
                        enrolled={true}
                        searchQuery={searchQuery}
                        warehouseId={warehouseId}
                        programTimeline={programTimeline}
                        isInternal={isInternal}
                        isIndependentStores={isIndependentStores}
                        sort={sort}
                        sortKey={sortKey}
                        canDownloadFromAPI={isAdmin}
                        agreementId={bulkEnrollmentProps?.selectedAgreementId}
                      />
                    ) : (
                      <DownloadCSVButton
                        stores={enrolledProgram?.stores || []}
                        filename={`enrolled-stores-${manufacturerName?.replace(/[^a-zA-Z0-9]/g, "-") || "manufacturer"}`}
                        fieldPreset="enrolledStores"
                        className="hidden md:flex text-xs px-2 py-1 min-w-min [&_img]:w-3 [&_img]:h-3"
                      />
                    )}
                    {showBulkEnrollment &&
                      bulkEnrollmentProps &&
                      bulkEnrollmentProps.selectedEnrolledStores.length > 0 && (
                        <>
                          <Button
                            color="danger"
                            rounded={false}
                            className="text-sm rounded min-w-[140px]"
                            size="sm"
                            onClick={() =>
                              bulkEnrollmentProps.onBulkEnroll("unenroll")
                            }
                          >
                            Unenroll Selected (
                            {bulkEnrollmentProps.selectedEnrolledStores.length})
                          </Button>
                          <Button
                            color=""
                            rounded={false}
                            className="text-sm rounded min-w-[100px]"
                            size="sm"
                            onClick={bulkEnrollmentProps.onClearEnrolled}
                          >
                            Clear All
                          </Button>
                        </>
                      )}
                  </div>
                </div>
              </div>
              <StoreTable
                stores={enrolledProgram?.stores || []}
                totalStores={enrolledProgram?.totalStores}
                currentPage={enrolledProgram?.currentPage}
                totalPages={enrolledProgram?.totalPages}
                pageVariable={PAGINATION_PAGE_QUERY_PARAMS.ENROLLEDPAGE}
                manufacturerName={manufacturerName}
                manufacturerId={manufacturerId}
                manufacturerLogo={manufacturerLogo}
                isStoreEnrolled
                isStoresPrograms
                isPrograms
                enablePurchaseSorting
                isSalesRep={isSalesRep}
                isAuthorizedManufacturer={isAuthorizedManufacturer}
                showEarningOpportunity
                showEnrollButton
                isIndependentStores={isIndependentStores}
                programTimeline={programTimeline}
                showNearToCompliancePercentage
                programIds={programIds}
                isLoadingTable={isLoadingTable}
                showCheckbox={showBulkEnrollment}
                selectedStores={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.selectedEnrolledStores
                    : undefined
                }
                setSelectedStores={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.setSelectedEnrolledStores
                    : undefined
                }
                onSingleStoreEnroll={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.onSingleStoreEnroll
                    : undefined
                }
                processingStoreIds={processingStoreIds}
                agreementId={bulkEnrollmentProps?.selectedAgreementId}
              />
            </Card>
          </Tab>
          <Tab label="Stores Not Enrolled">
            <Card className="w-full p-6">
              <div className="flex justify-between items-start flex-col gap-4 mb-4">
                <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                  Stores Not Enrolled in Program
                </h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-between w-full">
                  <SearchField
                    className={isSalesRep ? "text-xs md:flex-1" : "text-xs"}
                    pageVariable={PAGINATION_PAGE_QUERY_PARAMS.NOTENROLLEDPAGE}
                  />
                  <div className="flex items-center gap-3">
                    {showBulkEnrollment && isAdmin ? (
                      <DownloadCSVButton
                        stores={unenrolledProgram?.stores || []}
                        filename={`${user?.name}-unenrolled-stores-for-${manufacturerName || "manufacturer"}-program`?.replace(
                          /[^a-zA-Z0-9]/g,
                          "-"
                        )}
                        fieldPreset="unenrolledStores"
                        className="hidden md:flex text-xs px-2 py-1 min-w-min [&_img]:w-3 [&_img]:h-3"
                        manufacturerId={manufacturerId}
                        enrolled={false}
                        searchQuery={searchQuery}
                        warehouseId={warehouseId}
                        programTimeline={programTimeline}
                        isInternal={isInternal}
                        isIndependentStores={isIndependentStores}
                        hideEnrollTable={true}
                        sort={sort}
                        sortKey={sortKey}
                        canDownloadFromAPI={isAdmin}
                        agreementId={bulkEnrollmentProps?.selectedAgreementId}
                      />
                    ) : (
                      <DownloadCSVButton
                        stores={unenrolledProgram?.stores || []}
                        filename={`unenrolled-stores-${manufacturerName?.replace(/[^a-zA-Z0-9]/g, "-") || "manufacturer"}`}
                        fieldPreset="unenrolledStores"
                        className="hidden md:flex text-xs px-2 py-1 min-w-min [&_img]:w-3 [&_img]:h-3"
                      />
                    )}
                    {showBulkEnrollment &&
                      bulkEnrollmentProps &&
                      bulkEnrollmentProps.selectedUnenrolledStores.length >
                        0 && (
                        <>
                          <Button
                            color="success"
                            rounded={false}
                            className="text-sm rounded min-w-[140px]"
                            size="sm"
                            onClick={() =>
                              bulkEnrollmentProps.onBulkEnroll("enroll")
                            }
                          >
                            Enroll Selected (
                            {
                              bulkEnrollmentProps.selectedUnenrolledStores
                                .length
                            }
                            )
                          </Button>
                          <Button
                            color=""
                            rounded={false}
                            className="text-sm rounded min-w-[100px]"
                            size="sm"
                            onClick={bulkEnrollmentProps.onClearUnenrolled}
                          >
                            Clear All
                          </Button>
                        </>
                      )}
                  </div>
                </div>
              </div>
              <StoreTable
                id="unenrolled-stores-table"
                stores={unenrolledProgram?.stores || []}
                totalStores={unenrolledProgram?.totalStores}
                currentPage={unenrolledProgram?.currentPage}
                totalPages={unenrolledProgram?.totalPages}
                pageVariable={PAGINATION_PAGE_QUERY_PARAMS.NOTENROLLEDPAGE}
                manufacturerName={manufacturerName}
                manufacturerId={manufacturerId}
                manufacturerLogo={manufacturerLogo}
                isAuthorizedManufacturer={isAuthorizedManufacturer}
                isStoreEnrolled={false}
                isStoresPrograms
                isPrograms
                enablePurchaseSorting
                isSalesRep={isSalesRep}
                showEarningOpportunity
                showEnrollButton
                isIndependentStores={isIndependentStores}
                selectedWarehouseId={warehouseId}
                programTimeline={programTimeline}
                showNearToCompliancePercentage
                programIds={programIds}
                isLoadingTable={isLoadingTable}
                showCheckbox={showBulkEnrollment}
                selectedStores={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.selectedUnenrolledStores
                    : undefined
                }
                setSelectedStores={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.setSelectedUnenrolledStores
                    : undefined
                }
                onSingleStoreEnroll={
                  showBulkEnrollment && bulkEnrollmentProps
                    ? bulkEnrollmentProps.onSingleStoreEnroll
                    : undefined
                }
                processingStoreIds={processingStoreIds}
                agreementId={bulkEnrollmentProps?.selectedAgreementId}
              />
            </Card>
          </Tab>
        </Tabs>
      </div>

      {/* Bulk Enrollment Confirmation Dialog */}
      {showBulkEnrollment && bulkEnrollmentProps && (
        <BulkEnrollmentConfirmationDialog
          isOpen={bulkEnrollmentProps.isBulkEnrollmentDialogOpen}
          onClose={bulkEnrollmentProps.onCloseDialog}
          onConfirm={bulkEnrollmentProps.onConfirmBulkEnrollment}
          action={bulkEnrollmentProps.bulkEnrollmentAction}
          selectedStoreCount={
            bulkEnrollmentProps.bulkEnrollmentAction === "enroll"
              ? bulkEnrollmentProps.selectedUnenrolledStores.length
              : bulkEnrollmentProps.selectedEnrolledStores.length
          }
          agreements={bulkEnrollmentProps.agreements}
          isLoading={bulkEnrollmentProps.isBulkEnrollmentLoading}
          selectedAgreementId={bulkEnrollmentProps.selectedAgreementId}
          retailerPrograms={bulkEnrollmentProps.retailerPrograms}
        />
      )}
    </>
  );
};

export default StoreProgramDetailTabs;
