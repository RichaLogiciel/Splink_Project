const Loading = () => {
  // Default to first tab for loading state
  const isFirstTab = true;

  return (
    <div className={`storeDetails font-inter animate-pulse`}>
      {/* Header Section */}
      <div className="mb-2 flex justify-between flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center justify-between">
          <div className="icons flex">
            {/* Back button skeleton */}
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="border-l mx-3 h-7 border-gray-200"></div>
          </div>
          {/* Store name skeleton */}
          <div className="flex flex-col">
            <div className="w-32 h-6 bg-gray-200 rounded mb-2"></div>
          </div>
        </div>

        {/* Right side - dropdown and user info */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex flex-col">
              <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-8 mb-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="relative">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-${isFirstTab ? "3" : "2"} gap-4 mb-6`}>
        {(isFirstTab ? [1, 2, 3] : [1, 2]).map((item) => (
          <div key={item} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow">
        {/* Table Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              {(isFirstTab ? [1, 2] : [1]).map((item) => (
                <div key={item} className="relative">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="h-11 border-b text-heading-very-light text-xs">
                <tr>
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <th
                      key={item}
                      className="font-normal min-w-24 px-2 sm:px-4"
                    >
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr
                    key={item}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6].map((cell) => (
                      <td key={cell} className="px-2 sm:px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
