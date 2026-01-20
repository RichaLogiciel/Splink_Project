import React from "react";

const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="orderDetails font-inter p-0 animate-pulse">
      {/* Header Card Skeleton */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between">
          <div className="flex items-center">
            <div className="flex">
              {/* Back button skeleton */}
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="border-l mx-3 h-7 border-gray-200"></div>
            </div>
            {/* Order info skeleton */}
            <div className="flex flex-col">
              <div className="w-32 h-6 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="border-l mx-3 h-7 border-gray-200"></div>
            <div className="w-28 h-5 bg-gray-200 rounded"></div>
          </div>
          {/* Status badge skeleton */}
          <div className="w-24 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Order Items Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="w-32 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Generate 3 skeleton cards */}
          {[1, 2, 3].map((index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="w-full h-5 bg-gray-200 rounded mb-3"></div>
              <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="flex justify-between items-center mt-4">
                <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailSkeleton;
