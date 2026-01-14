import { ENABLE_PROGRAM_EXPIRATION_NOTICE } from "@/utils/constants";

export default function StoreDashboardLoader() {
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

      {/* Dashboard Title */}
      <div className="mb-4 sm:mb-6">
        <div className="h-6 bg-gray-300 rounded w-32"></div>
      </div>

      {/* Store Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-gray-300 rounded mb-2"></div>
            <div className="w-32 h-4 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>

      {/* Program List Section */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="h-6 bg-gray-300 rounded w-32"></div>
        <div className="h-8 bg-gray-300 rounded w-32"></div>
      </div>

      {/* Store Program Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
            <div className="space-y-3">
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
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
