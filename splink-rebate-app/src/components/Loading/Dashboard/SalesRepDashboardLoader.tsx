import {
  ENABLE_PROGRAM_EXPIRATION_NOTICE,
  SPIFF_OPPORTUNITIES_FEATURE,
  SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { isDistributorFeatureEnabled } from "@/utils/helper";

export default async function SalesRepDashboardLoader() {
  const user = await getUserServer();
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const storeProgrammingEnabled = isDistributorFeatureEnabled(
    distributorId,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  const spiffsEnabled = isDistributorFeatureEnabled(
    distributorId,
    SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

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
      <div className="mb-4">
        <div className="h-6 bg-gray-300 rounded w-48"></div>
      </div>

      {/* Top Key Metrics Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((item) => (
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

      {/* SPIFF Opportunities and Void Fill Programs Summary Cards */}
      {SPIFF_OPPORTUNITIES_FEATURE && spiffsEnabled && (
        <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-6 mb-6">
          {/* SPIFF Opportunities Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-gray-300 rounded w-32"></div>
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between p-3 border-y rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Void Fill Programs Summary Card */}
          {spiffsEnabled && (
            <div className="mb-6 w-full">
              <div className="bg-white p-6 rounded-lg shadow">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-gray-300 rounded w-48"></div>
                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                </div>

                {/* Filter Section */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="h-8 bg-gray-300 rounded w-32"></div>
                  <div className="h-8 bg-gray-300 rounded w-24"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="text-center">
                      <div className="h-3 bg-gray-300 rounded w-20 mx-auto mb-2"></div>
                      <div className="h-5 bg-gray-300 rounded w-16 mx-auto"></div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="h-11 border-b">
                      <tr>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                          <th
                            key={item}
                            className="font-normal min-w-24 px-2 sm:px-4"
                          >
                            <div className="h-4 bg-gray-300 rounded w-20"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((item) => (
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
            </div>
          )}
        </div>
      )}

      {/* Compliances Insights Table */}
      {storeProgrammingEnabled && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 bg-gray-300 rounded w-48"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-300 rounded w-24"></div>
                <div className="h-8 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="h-11 border-b">
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <th
                        key={item}
                        className="font-normal min-w-24 px-2 sm:px-4"
                      >
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
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
        </div>
      )}

      {/* Bottom Row - Enrolled Stores and Earnings */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {storeProgrammingEnabled && (
          <div className="flex-col w-full">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-300 rounded w-32"></div>
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded"></div>
                      <div>
                        <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {!SPIFF_OPPORTUNITIES_FEATURE && spiffsEnabled && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-gray-300 rounded w-32"></div>
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
