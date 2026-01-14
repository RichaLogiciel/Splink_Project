"use client";

import BackButton from "@/components/Buttons/BackButton";
import Card from "@/components/Card";
import InfoCard from "@/components/InfoCard";
import OrderItemCard from "@/components/OrderItemCard";
import OrderDetailSkeleton from "@/components/skeletons/OrderDetailSkeleton";
import StatusBadge from "@/components/StatusBadge";
import { APP_ROUTES } from "@/configs/routes";
import { apiClient } from "@/lib/axiosClient";
import React, { useEffect, useState } from "react";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  quantityType: "UNIT" | "BOX" | "CASE";
  size: string;
  description: string;
  distProductId?: string | null;
  name: string;
  Product: {
    name: string;
    brand: string;
    size: string;
    internal_code: string;
    product_name: string;
  };
  Manufacturer: { name: string };
}

interface OrderDetails {
  id: string;
  createdAt: string;
  totalAmount: number;
  quantity: number;
  status: string;
  OrderItems: OrderItem[];
}

interface OrderDetailProps {
  orderId: string;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ orderId }) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/orders/${orderId}`);
        setOrderDetails(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (!orderDetails) {
    return <div className="text-center py-8">Order not found</div>;
  }
  return (
    <div className="orderDetails font-inter p-0">
      <Card>
        <div className="flex justify-between">
          <div className="flex items-center justify-between">
            <div className="icons flex">
              <BackButton link={`${APP_ROUTES.store}`} />
              <div className="seperater min-h-7 border ml-3 mr-5 border-border-gray"></div>
            </div>
            <div className="flex items-center justify-between flex-col">
              <h2 className="text-lg font-semibold text-highlighted-color">
                Order #{orderId}
              </h2>
              <h4 className="text-heading-very-light text-xs">
                {new Date(orderDetails.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </h4>
            </div>
            <div className="seperater min-h-7 border ml-3 mr-5 border-border-gray"></div>

            <p className="text-sm text-gray-500">
              Total Items:{" "}
              <span className="text-md font-semibold text-highlighted-color">
                {orderDetails.quantity}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={orderDetails.status} />
          </div>
        </div>
      </Card>
      <div className="mb-7 flex justify-between items-center">
        <div className="flex items-center justify-between">
          <div className="store-info text-right sm:text-left"></div>
        </div>
        <div></div>
      </div>
      <InfoCard title="Order Items">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderDetails?.OrderItems.map((item) => (
              <OrderItemCard
                key={item.id}
                id={item.id}
                name={item.Product.product_name || item.Product.name}
                brand={item.Manufacturer.name}
                size={item.Product.size}
                internalCode={item.distProductId || item.Product.internal_code}
                quantity={item.quantity}
                quantityType={item.quantityType}
              />
            ))}
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

export default OrderDetail;
