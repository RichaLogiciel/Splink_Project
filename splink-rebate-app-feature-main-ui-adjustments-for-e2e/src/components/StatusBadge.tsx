import { ORDER_STATUS } from "@/utils/constants";
import React from "react";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case ORDER_STATUS.COMPLETED:
        return "bg-green/10 text-green";
      case ORDER_STATUS.PLACED:
        return "bg-green/10 text-green";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${getStatusStyles(status)}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
