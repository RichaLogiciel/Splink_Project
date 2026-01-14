export default function Loading() {
  return (
    <main className="loader">
      <div className="mb-4 flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center">
          <div className="icons flex">
            <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
            <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="avatar w-9 h-9 bg-gray-300 rounded-md animate-pulse"></div>
            <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1rem] sm:gap-[1.5rem]">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-lg p-4 bg-white w-full h-[121px] flex-0 items-center"
          >
            <div className="flex justify-between mb-4 flex-col">
              <div className="flex gap-1.5 items-center">
                <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between mb-0 items-center">
              <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 sm:mt-7">
        <div className="customTabs px-[0px] py-[0px] font-medium text-heading-light">
          <div className="product-list-header flex justify-between">
            <div className="tab-label-container min-h-9 tab-labels flex gap-8 text-base">
              {[1, 2, 3].map((item) => (
                <div key={item} className="relative">
                  <div className="h-6 bg-gray-300 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="tab-content border-t py-6">
            <div className="rounded-lg p-4 bg-white w-full p-6">
              <div className="h-6 bg-gray-300 rounded w-48 animate-pulse mb-4"></div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="h-11 border-b text-heading-very-light text-xs">
                    <tr>
                      {[1, 2, 3, 4].map((item) => (
                        <th
                          key={item}
                          className="font-normal min-w-24 px-2 sm:px-4"
                        >
                          <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2].map((item) => (
                      <tr
                        key={item}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                      >
                        {[1, 2, 3, 4].map((item) => (
                          <td key={item} className="px-2 sm:px-4 py-3">
                            <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-lg bg-white w-full p-6 mt-6">
              <div className="h-6 bg-gray-300 rounded w-48 animate-pulse mb-4"></div>
              <div className="text-xs">
                <div className="h-4 bg-gray-300 rounded w-24 animate-pulse mb-2"></div>
                <ul>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <li
                      key={item}
                      className="py-3.5 last:border-0 last:pb-0 border-b border-border-gray"
                    >
                      <div className="h-4 bg-gray-300 rounded w-48 animate-pulse"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
