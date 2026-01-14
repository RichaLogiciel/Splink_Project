import React from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";

// Import Icons
import { formatNumber } from "@/utils/numberFormatter";
import TotalStoreCountIcon from "../../icons/TotalStoreCount";

interface TotalStoresCardProps {
  activeStoresCount: number;
}

const TotalStoresCard: React.FC<TotalStoresCardProps> = ({
  activeStoresCount
}) => {
  return (
    <Card>
      <Row className="justify-between" marginBottom="mb-4">
        <div className="flex gap-1.5 items-center">
          <TotalStoreCountIcon />
          <div className="text-sm font-medium text-heading-light">
            {"Store Customers"}
          </div>
        </div>
      </Row>
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-xl font-semibold">
          {formatNumber(activeStoresCount)}
        </div>
      </Row>
    </Card>
  );
};

export default TotalStoresCard;
