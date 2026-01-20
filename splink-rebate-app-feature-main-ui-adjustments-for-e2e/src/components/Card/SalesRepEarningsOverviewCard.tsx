"use client";

import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";

// Import Utils
import { MESSAGES } from "@/configs/messages";
// import { getUserClient } from "@/utils/getUserClient";
import { formatNumber } from "@/utils/numberFormatter";
// import { useRouter } from "next/navigation";
import StoreDetailsModal from "../Dialog/StoreDetailsModal";

interface SalesRepEarningDetail {
  ManufacturerId: number;
  ManufacturerName: string;
  ManufacturerLogo: string;
  totalEarnedRebate: string;
}
interface SalesRepEarningsOverviewCardProps {
  earnings: SalesRepEarningDetail[];
}

const SalesRepEarningsOverviewCard: React.FC<
  SalesRepEarningsOverviewCardProps
> = ({ earnings }) => {
  // const router = useRouter();
  // const user = getUserClient();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<any>(null);
  const openSpiffProgramModal = ({
    id,
    logo,
    name,
    earnings
  }: {
    id: number;
    name: string;
    logo: string;
    earnings: string;
  }) => {
    setSelectedManufacturer({ id, logo, name, earnings });
    setIsModalOpen(true);
  };
  return (
    <>
      <Card className="w-full mb-6">
        <Row className="justify-between" marginBottom="mb-2">
          <div className="text-s font-normal text-heading-very-light">
            SPIFF Program Overview
          </div>
        </Row>
        <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter max-h-[50vh] overflow-y-auto -mr-2 pr-2">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white">
              <tr>
                <th className="font-medium pr-4">Manufacturers</th>
                <th className="font-medium pr-4 text-right">My Earnings</th>
              </tr>
            </thead>
            <tbody>
              {earnings?.length > 0 ? (
                earnings.map((earning, index) => (
                  <tr
                    key={`${index}-${earning.ManufacturerId}`}
                    className="border-b cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      openSpiffProgramModal({
                        id: earning.ManufacturerId,
                        logo: earning.ManufacturerLogo,
                        name: earning.ManufacturerName,
                        earnings: earning.totalEarnedRebate
                      })
                    }
                  >
                    <td className="pr-4 py-3 flex items-center gap-3.5">
                      <div className="avatar h-8 w-8 overflow-hidden flex justify-center items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={earning.ManufacturerLogo} alt="Logo"></img>
                      </div>
                      <p className="font-medium">{earning.ManufacturerName}</p>
                    </td>
                    <td className="pr-4 py-3 text-base text-green text-right">
                      ${formatNumber(Number(earning.totalEarnedRebate))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="text-heading-very-light">
                  <td className="text-center pt-3 text-sm" colSpan={3}>
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StoreDetailsModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        data={{
          manufacturer: {
            id: selectedManufacturer?.id,
            avatar: selectedManufacturer?.logo,
            name: selectedManufacturer?.name
          },
          totalSavings: {
            amount: selectedManufacturer?.earnings ?? 0
          }
        }}
        hideIncrementalEarnings
      />
    </>
  );
};

export default SalesRepEarningsOverviewCard;
