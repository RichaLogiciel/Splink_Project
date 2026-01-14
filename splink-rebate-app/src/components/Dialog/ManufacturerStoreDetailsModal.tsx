// Import Core functionality/component
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";

// Import Components
import WishlistProductsList from "@/components/Product/WishlistProductsList";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import Avatar from "../Avatar/RepAvatar";
import BarChartCustom from "../BarChartCustom";
import Card from "../Card";
import Divider from "../Divider";
import Loader from "../Loader";
import Row from "../Row";

// Import Types
import {
  Manufacturer,
  ManufacturerStoreDetailsModal
} from "@/types/StoreTypes";

// Import Images
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";

// Import Util functions
import { apiClient } from "@/lib/axiosClient";
import { WishlistProducts } from "@/types/ProductTypes";
import { formatYAxisValueChart } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";

const ManufacturerProgramDetailsModal: React.FC<
  ManufacturerStoreDetailsModal
> = ({ isOpen, setIsOpen, data }) => {
  const [manufacturerData, setManufacturerData] = useState<Manufacturer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chartData, setChartData] = useState([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );

  useEffect(() => {
    async function fetchData(
      id: string,
      manufacturerId: number,
      distributorId?: number
    ) {
      try {
        setIsLoading(true);

        // Use Promise.all to fetch both API calls simultaneously
        const [res, res2]: [any, any] = await Promise.all([
          apiClient.get(
            `/store/${id}/manufacture/${manufacturerId}`
          ) as Promise<any>,
          apiClient.get(
            `/manufacturer/${manufacturerId}/store/${id}?distributorId=${distributorId}`
          ) as Promise<any>
        ]);

        // Check the responses and update state
        // if (res.status === "success" && res2.status === "success") {
        setChartData(res2.data.chartData);
        setCategories(res2.data.categories);
        setManufacturerData({
          ...res.data
        });
        // }
      } catch (e) {
        console.error("error", e);
        setManufacturerData(null);
        setCategories([]);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen && data?.id)
      fetchData(data?.id, 1, data?.storeInfo.distributor?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    async function fetchData(
      id: string,
      manufacturerId: number,
      distributorId?: number
    ) {
      try {
        setIsLoading(true);

        let url = `/manufacturer/${manufacturerId}/store/${id}?distributorId=${distributorId}`;

        if (activeCategory > 0) {
          url += `&categoryId=${activeCategory}`;
        }

        const res: any = await apiClient.get(url);

        // Check the responses and update state
        // if (res.status === "success") {

        setChartData(res.data.chartData);
        // }
      } catch (e) {
        console.error("error", e);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (data?.id && isOpen && categories)
      fetchData(data?.id, 1, data?.storeInfo.distributor?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const handleCategoryChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedCategoryId = parseInt(e.target.value);
    setActiveCategory(selectedCategoryId);
  };

  const formatYAxisSales = (tickItem: number) => {
    return formatYAxisValueChart(tickItem);
  };
  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        {!!data && (
          <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4">
            <div className="flex min-h-full items-center justify-center">
              <DialogPanel className="max-w-2xl w-full border bg-white p-4 sm:p-6 rounded-lg">
                <DialogTitle className="flex justify-between mb-6">
                  <div className="flex flex-col">
                    <p className="font-semibold text-lg">
                      {data.storeInfo.name}
                    </p>
                    <span className="block text-xs text-heading-very-light">
                      {data.storeInfo.location}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    {!!data?.storeInfo?.distributor && (
                      <Avatar user={data.storeInfo.distributor} />
                    )}
                    <Image
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer"
                      src={popupCloseIcon.src}
                      alt="popupCloseIcon"
                      height={13}
                      width={13}
                    />
                  </div>
                </DialogTitle>

                <div className="mt-6 border p-4 rounded-lg">
                  <Row className="justify-between items-end">
                    <div className="flex flex-col">
                      <div className="text-base font-semibold">
                        Program Compliance
                      </div>
                    </div>
                    <select
                      value={activeCategory}
                      onChange={handleCategoryChange}
                      className="text-xs outline-none rounded p-2 border border-border-gray"
                    >
                      {[{ id: 0, name: "Category" }, ...categories].map(
                        (category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </Row>
                  <Divider />
                  {chartData?.length ? (
                    <BarChartCustom
                      data={chartData}
                      barColor="#0071B3"
                      barSize={20}
                      padding={25}
                      xAxisKey="date"
                      yAxisKey="purchase"
                      yAxisTickFormatter={formatYAxisSales}
                      yAxisWidth={70}
                      showAllxAxisTicks
                    />
                  ) : (
                    <div className="text-base font-semibold">No Data</div>
                  )}
                </div>

                <div className="mt-6 border rounded-lg">
                  <Row className="flex-col w-full" marginBottom="0">
                    <Card className="flex-1">
                      <Row className="justify-between items-end">
                        <div className="flex flex-col">
                          <div className="text-lg font-semibold">
                            Store Program Overview
                          </div>
                          <div className="text-base font-semibold">
                            Estimated Rebate
                          </div>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold">
                          ${formatNumber(data.salesData.totalSavings.amount)}
                        </span>
                      </Row>
                      <Divider />

                      <Loader
                        show={isLoading && !categories.length}
                        className="relative bg-white mt-6"
                      />

                      {(!isLoading || categories.length) &&
                        !!manufacturerData?.tierDetails?.length && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-h-60 [@media(min-height:600px)]:max-h-[25vh] [@media(min-height:800px)]:max-h-[30vh] overflow-y-auto">
                            {manufacturerData?.tierDetails?.map(
                              (tierDetail, index) => (
                                <div
                                  className="flex justify-between items-center border rounded-lg p-3 flew-wrap"
                                  key={`${index}-${tierDetail.title}`}
                                >
                                  <div className="text-base font-semibold">
                                    {tierDetail.title}
                                  </div>
                                  <span
                                    className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                                    style={{
                                      background:
                                        tierDetail?.isProgramComplianceQualified
                                          ? "#cfe0cf"
                                          : "#f2cece",
                                      color:
                                        tierDetail?.isProgramComplianceQualified
                                          ? "#106210"
                                          : "#BC0909"
                                    }}
                                  >
                                    {tierDetail?.isProgramComplianceQualified
                                      ? "Yes"
                                      : "No"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </Card>
                  </Row>
                </div>

                {(!isLoading || categories.length) && (
                  <div className="mt-6 border rounded-lg p-4">
                    <Tabs
                      contentClass="pt-[18px] pb-[0]"
                      labelContainerClass="gap-[16px] text-heading-light"
                      labelClass="text-xs"
                      className="py-[0px] px-[0px]"
                      tabSearchParamKey="storeDetailProductTab"
                      defaultTab={0}
                      resetTabs={!isOpen}
                    >
                      <Tab label="Recommended Products">
                        <WishlistProductsList
                          showWishlists={false}
                          isInPopup
                          products={
                            manufacturerData?.additionalInfo?.recommendedProducts?.map(
                              (pro) =>
                                ({
                                  product_name: pro.name,
                                  product_id: pro.id
                                }) as WishlistProducts
                            ) ?? []
                          }
                        />
                      </Tab>
                      <Tab label="Purchased Products">
                        <WishlistProductsList
                          isInPopup
                          showWishlists={false}
                          products={
                            manufacturerData?.additionalInfo?.purchasedProducts?.map(
                              (pro) =>
                                ({
                                  product_name: pro.name,
                                  product_id: pro.id
                                }) as WishlistProducts
                            ) ?? []
                          }
                        />
                      </Tab>
                    </Tabs>
                  </div>
                )}
              </DialogPanel>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};
export default ManufacturerProgramDetailsModal;
