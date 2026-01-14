import React from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";
import { formatNumber } from "@/utils/numberFormatter";

// Import Icons
import TotalDistributorsIcon from "@/assets/logo/total-distributors.svg";

interface TotalDistributorsCardProps {
  distributorsCount: number;
}
const TotalDistributorsCard: React.FC<TotalDistributorsCardProps> = ({
  distributorsCount
}) => {
  return (
    <Card>
      <Row className="justify-between" marginBottom="mb-4">
        <div className="flex gap-1.5 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TotalDistributorsIcon.src} alt="Total Distributors Icon" />
          <div className="text-sm font-medium text-heading-light">
            Distributors
          </div>
        </div>
      </Row>
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-xl font-semibold">
          {formatNumber(distributorsCount)}
        </div>
      </Row>
    </Card>
  );
};

export default TotalDistributorsCard;
