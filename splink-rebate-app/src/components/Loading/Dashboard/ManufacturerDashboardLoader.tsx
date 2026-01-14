import { ENABLE_PROGRAM_EXPIRATION_NOTICE } from "@/utils/constants";

export default function ManufacturerDashboardLoader() {
  return (
    <div className="animate-pulse">
      {/* Program Expiration Notice */}
      {ENABLE_PROGRAM_EXPIRATION_NOTICE && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-300 rounded"></div>
            <div className="h-4 bg-yellow-300 rounded w-64"></div>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="mb-4 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-8 bg-gray-300 rounded w-32"></div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 bg-gray-300 rounded w-24"></div>
          <div className="h-8 bg-gray-300 rounded w-24"></div>
          <div className="h-8 bg-gray-300 rounded w-24"></div>
        </div>
      </div>

      {/* Top Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
            <div className="w-20 h-8 bg-gray-300 rounded mb-2"></div>
            <div className="w-32 h-4 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>

      {/* Sales Chart Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-300 rounded w-48"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-300 rounded w-20"></div>
            <div className="h-8 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>

      {/* Product Rankings Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-300 rounded w-48"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-300 rounded w-24"></div>
            <div className="h-8 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b">
              <tr>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <th key={item} className="font-normal min-w-24 px-2 sm:px-4">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                <tr key={item} className="border-b">
                  {[1, 2, 3, 4, 5, 6].map((cell) => (
                    <td key={cell} className="px-2 sm:px-4 py-3">
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Selling Products Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-300 rounded w-48"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-300 rounded w-24"></div>
            <div className="h-8 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-300 rounded w-28"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
