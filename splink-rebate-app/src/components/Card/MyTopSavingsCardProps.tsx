import React from "react";

// Import component
import Card from "@/components/Card";
import Divider from "@/components/Divider";
import Row from "@/components/Row";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";
import { MESSAGES } from "@/configs/messages";

// Import Images
// import InfoIcon from "@/assets/icons/info.svg";

interface MyTopSavingsCardProps {
  topSavingsData: any[];
}

const MyTopSavingsCard: React.FC<MyTopSavingsCardProps> = ({
  topSavingsData
}) => {
  return (
    <Card>
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-xs font-normal text-heading-light">
          My Top Earnings
        </div>
      </Row>
      <Divider marginY="mt-3.5" />
      <Row className="flex-col" gap="gap-0" marginBottom="mb-0">
        {topSavingsData && topSavingsData?.length > 0 ? (
          topSavingsData.map(
            (
              data: {
                totalSavings: string;
                manufacturerId: number;
                manufacturerName: string;
              },
              index: number
            ) => {
              return (
                <div key={`data.label-${index}`}>
                  <Row marginBottom="mb-0 justify-between px-3 py-3.5">
                    <div
                      className="text-sm font-normal text-filter-light"
                      id={String(index)}
                    >
                      {data.manufacturerName}
                    </div>
                    <div className="flex gap-1">
                      <div className="text-sm font-medium TESTING1">
                        ${formatNumber(Number(data.totalSavings))}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {/* <img
                        title={
                          "Total Purchase amount is $" +
                          formatNumber(Number(data.totalSavings))
                        }
                        src={InfoIcon.src}
                        alt="Info Icon"
                      /> */}
                    </div>
                  </Row>
                  <Divider marginY="my-0" />
                </div>
              );
            }
          )
        ) : (
          <p className="text-center font-medium text-heading-very-light text-sm pt-3">
            {MESSAGES.NO_RECORDS_FOUND}
          </p>
        )}
      </Row>
    </Card>
  );
};

export default MyTopSavingsCard;
