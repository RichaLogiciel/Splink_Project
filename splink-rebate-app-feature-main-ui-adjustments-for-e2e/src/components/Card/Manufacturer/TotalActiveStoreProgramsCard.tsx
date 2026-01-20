import React from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";
import { formatNumber } from "@/utils/numberFormatter";

// Import Icons
import TotalActiveStoreProgramsIcon from "@/assets/logo/total-active-store-programs.svg";

interface TotalActiveStoreProgramsCardProps {
  storesEnrolledInProgramsCount: number;
}
const TotalActiveStoreProgramsCard: React.FC<
  TotalActiveStoreProgramsCardProps
> = ({ storesEnrolledInProgramsCount }) => {
  return (
    <Card>
      <Row className="justify-between" marginBottom="mb-4">
        <div className="flex gap-1.5 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TotalActiveStoreProgramsIcon.src}
            alt="Total Active Store Programs"
          />
          <div className="text-sm font-medium text-heading-light">
            Active Store Programs
          </div>
        </div>
      </Row>
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-xl font-semibold">
          {formatNumber(storesEnrolledInProgramsCount)}
        </div>
      </Row>
    </Card>
  );
};

export default TotalActiveStoreProgramsCard;
