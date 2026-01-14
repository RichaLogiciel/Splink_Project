"use client";
import Avatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card/";
import { MESSAGES } from "@/configs/messages";
import { formatNumber } from "@/utils/numberFormatter";
import { useRouter } from "next/navigation";

interface EnrolledStores {
  ManufacturerId?: number;
  ManufacturerName?: string;
  ManufacturerLogo?: string;
  ProgramEnrollment?: number;
  WarehouseStoresCount?: number;
  totalStoresCount?: number;
  EnrolledStroes?: number;
  CompliancePercentage?: number;
}

interface EnrolledStoresCardProps {
  items: EnrolledStores[];
  totalStores: number;
  largeHeight?: boolean;
  warehouseId?: string;
  itemSpecificTotalCount?: boolean;
}

const EnrolledStoresCard: React.FC<EnrolledStoresCardProps> = ({
  items,
  totalStores = 0,
  largeHeight,
  warehouseId,
  itemSpecificTotalCount
}) => {
  const router = useRouter();
  return (
    <Card className="w-full">
      <p className="text-s font-normal text-heading-very-light mb-2">
        Program Enrollment
      </p>
      <div
        className={`signedStoresTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter ${largeHeight ? "max-h-[50vh]" : "max-h-60"} overflow-y-auto -mr-2 pr-2`}
      >
        <table className="w-full border-collapse table-fixed">
          <thead className="h-11 text-heading-very-light text-xs border-b border-border-gray sticky top-0 bg-white">
            <tr>
              <th className="font-medium pr-4 w-8">#</th>
              <th className="font-medium pr-4 w-full">Manufacturer</th>
              <th className="font-medium pr-4 w-full">% Compliant</th>
              <th className="font-medium pr-4 w-28">Enrolled Stores</th>
            </tr>
          </thead>
          <tbody className="text-heading-very-light">
            {items?.length > 0 ? (
              items?.map((item, index) => (
                <tr
                  key={`manufacturerStoreProgram-${index}`}
                  className="border-b cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    router.push(
                      `/app/programs/store/${item.ManufacturerId}?id=${item.ManufacturerId}&manufacturerName=${encodeURIComponent(
                        item.ManufacturerName ?? ""
                      )}`
                    )
                  }
                >
                  <td className="pr-4 py-2.5">{index + 1}</td>
                  <td className="pr-4 py-2.5">
                    <Avatar
                      user={{
                        logo: item.ManufacturerLogo,
                        name: item.ManufacturerName
                      }}
                    />
                  </td>
                  <td className="pr-4 py-2.5">
                    <div className="text-base font-semibold text-highlighted-color">
                      {formatNumber(
                        Number(item?.CompliancePercentage ?? "0"),
                        false,
                        1
                      )}
                      %
                    </div>
                  </td>
                  <td className="pr-4 py-2.5">
                    <div className="text-base font-semibold text-highlighted-color">
                      {formatNumber(item.EnrolledStroes ?? 0)}
                      <span className="text-xs text-heading-very-light font-semibold">
                        /{formatNumber(item.totalStoresCount ?? 0)}
                        {/* {formatNumber(
                          warehouseId
                            ? (item.WarehouseStoresCount ?? 0)
                            : itemSpecificTotalCount
                              ? (item.totalStoresCount ?? 0)
                              : totalStores
                        )} */}
                        <span></span>
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="pt-3" colSpan={4}>
                  <p className="text-center font-medium text-heading-very-light text-sm">
                    {MESSAGES.NO_RECORDS_FOUND}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default EnrolledStoresCard;
