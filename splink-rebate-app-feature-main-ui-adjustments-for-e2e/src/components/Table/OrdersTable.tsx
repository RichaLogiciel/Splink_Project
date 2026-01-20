"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import StatusBadge from "../StatusBadge";

interface Order {
  id: number;
  createdAt: string;
  totalAmount: number;
  quantity: number;
  status: string;
}

interface OrdersTableProps {
  ordersData: any[];
}

const OrdersTable: React.FC<OrdersTableProps> = ({ ordersData }) => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(ordersData);

  useEffect(() => {
    setOrders(ordersData);
  }, [ordersData]);

  const handleViewDetails = (orderId: number) => {
    router.push(`/app/orders/${orderId}`);
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No orders found</div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-border-gray">
      <thead className="h-11 border-b text-heading-very-light text-xs">
        <tr>
          <th className="min-w-50 font-semibold px-4">Order ID</th>
          <th className="min-w-50 font-semibold px-4">Date</th>
          <th className="min-w-50 font-semibold px-4">Quantity</th>
          {/* <th className="min-w-50 font-semibold px-4">Order Value</th> */}
          <th className="min-w-50 font-semibold px-4">Status</th>
          <th className="min-w-50 font-semibold px-4">Action</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-border-gray">
        {orders.map((order) => (
          <tr key={order.id} className="hover:bg-gray-50">
            <td className="p-4 whitespace-nowrap">#{order.id}</td>
            <td className="p-4 whitespace-nowrap">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </td>
            {/* <td className="p-4 whitespace-nowrap">
              ${formatNumber(order.totalAmount)}
            </td> */}
            <td className="p-4 whitespace-nowrap">{order.quantity}</td>
            <td className="p-4 whitespace-nowrap">
              <StatusBadge status={order.status} />
            </td>
            <td className="p-4 whitespace-nowrap">
              <button
                onClick={() => handleViewDetails(order.id)}
                className="py-1 px-2 text-sm text-white bg-green rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default OrdersTable;
